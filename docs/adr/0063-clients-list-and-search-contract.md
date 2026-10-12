# ADR 0063 — Clients: list and search contract

Status: accepted (2026-10); extends [ADR 0044](0044-clients-aggregate-uniqueness-and-conflict-contract.md) (the
situation) and [ADR 0060](0060-clients-read-by-id-contract.md) (the CPF on the wire); corrects the guidance of
[`ARCHITECTURE`](../../backend/docs/ARCHITECTURE.md) §5 on `EF.Property<string>` over a value-object column

## Context

#155 adds `GET /api/v1/clients?page=&pageSize=&q=&status=` to list and search the people a business serves. The
client aggregate, the situation, the soft-delete and tenant filters and the paged-list shape (`PagedResult<T>`)
already existed. Open were: the shape of a list item, whether the CPF is masked, what `q` matches, what "normalized
name" means for the order, and how an invalid parameter answers.

One finding shaped the persistence of the search. `FullName`, `Email` and `Cpf` are shared value objects with a
column conversion, and a query cannot read such a column as text. A probe with the repository's EF Core and Npgsql
versions showed:

- `EF.Property<string>(c, "FullName")` (the same for `Email` and `Cpf`) throws `InvalidOperationException: No
  coercion operator is defined between types 'FullName' and 'String'`. `ARCHITECTURE` §5 and the slice skill said to
  use it for text matching; they were wrong for a converted column.
- A second, string-typed property mapped to the same column (`HasColumnName("Email")`) does not alias it: EF renames
  the real column (`Email1`) in the generated SQL.
- Ordering by the whole value object (`OrderBy(c => c.FullName)`) translates, but sorts by the typed casing, which
  is not "normalized".

## Decision

**Endpoint.** `GET /api/v1/clients` with `page` (from 1), `pageSize` (default 20, 1 to 100), `q` and `status`. It
answers `200` with `ApiResponse<PagedResult<ClientListItemResponse>>`: `items`, `totalCount`, `page`, `pageSize`.
The members of the query are `Page`, `PageSize`, `Q` and `Status`: a validation error is keyed by the property path
in camelCase, so the member is named after the wire parameter. The OpenAPI document lists the parameters in
PascalCase, like every other list, and the binding is case-insensitive.

**The item.** `ClientListItemResponse`: `id`, `fullName`, `birthDate`, `phone`, `email`, `cpf`, `status`. No
guardians, reference contacts or notes, no `age` (ADR 0060). The repository returns the client roots without their
contacts loaded, and the mapping reads the root only; the list is not a place to load children.

**The CPF is not masked.** It comes whole, digits only, as the detail returns it. This is a product decision of the
owner on 2026-10-12, taken against the text of #155 ("Mascarar CPF na lista") and the criterion of the parent #139
("CPF não aparece integralmente em listagens"); both need to be reconciled with it. It follows ADR 0060: the project
has no roles, every authenticated user of the tenant sees the whole CPF in the detail, and the list adds no new kind
of reader. What changes is volume: up to 100 whole CPFs per response.

**Situation.** `status` is a string on the wire: `active` (default), `inactive` or `all`, in any case. Omitted or
blank is `active`; a number is refused. `all` is "no restriction", and soft-deleted people never appear, whatever the
value. The validator checks it, not the model binder: an enum bound by the framework answers an English message under
the generic code, and the issue asks for a stable code.

**Search.** `q` is trimmed; blank means no search. The handler lowercases it and matches it as "contains":

- in the name and in the e-mail;
- in the CPF digits too, when the term without `.`, `-` and spaces is only digits. A masked `529.982.247-25` finds
  that person; `982` finds the CPFs that contain 982 and, as any term, the names and e-mails that contain it.

The three matches are joined by "or" and combined with the situation by "and". A person with no e-mail and no CPF is
found by name. The handler derives the two plain values (`text`, `cpfDigits`); the repository port takes them.

**Order.** The normalized name, then the id, so that a page never repeats or skips a record while the data does not
change. "Normalized" is `lower("FullName")`, like `Service`, `Tag` and `Category`: accents stay, so `jose` does not
find `José` (it would find `jose@…` by e-mail), and the order of accented names follows the database collation
(`en_US.utf8` in the `postgres:18.3` image: `Álvaro` sorts with `Alvaro`). The id tie-break is the PostgreSQL `uuid`
byte order.

**Three stored generated columns** are the string handle the search and the order need, added by the additive
migration `AddClientSearchColumns`:

| Column | Expression |
| --- | --- |
| `NameNormalized` | `lower("FullName")` |
| `EmailNormalized` | `lower("Email")` |
| `CpfNormalized` | `"Cpf"` |

They are shadow properties of type `string` in `ClientConfiguration`, so `EF.Property<string>(c, "NameNormalized")
.Contains(text)` translates to `LIKE @p`, and EF escapes `%`, `_` and `\` in the term: they are literal. (The `ILike`
of `Service`, `Tag` and `Category` sends `ESCAPE ''`, so `%` and `_` are wildcards there. This change does not touch
them.) PostgreSQL fills the columns for existing rows when the migration runs, and `Down` drops only them. Each
client load now reads three more short strings, because EF loads every mapped column of an entity.
`lower()` follows the database ctype, as it already does for the service names.

**Validation.** Gate 2, with the codes below and pt-BR messages naming the field:

| Rule | Code |
| --- | --- |
| `page` at least 1 | `Client.PageInvalid` |
| `(page - 1) * pageSize` fits an `int` | `Client.PageTooLarge` |
| `pageSize` from 1 to 100 | `Client.PageSizeInvalid` |
| `q` up to 254 characters, the longest searchable value (an e-mail) | `Client.SearchTooLong` |
| `status` one of the three words, or blank | `Client.StatusFilterInvalid` |

`Client.PageTooLarge` exists because `RepositoryBase.ListPagedAsync` computes the offset in `int`: the older list
`GET /api/v1/services?page=2147483647&pageSize=100` answers `500 Unexpected.Error`, and `page=43000000` silently
computes an offset of 5,032,604 instead of 4,299,999,900, so a large enough table would answer a wrong page instead of
an empty one. A framework binding failure (`page=abc`)
stays gate 1: `400 Validation.Failed` with the framework's English text.

**A page past the last** answers `200` with empty `items`, the real `totalCount` and the requested `page`.

**No index.** Measured on the disposable PostgreSQL below with 50,000 people in one tenant (a tenth inactive), the
list answered in 30 to 45 ms at the median through HTTP in every case — default, `status=all`, a name term with 882
hits, an e-mail term with 15,000, a whole CPF, a partial CPF, a term with no hit — and 132 ms at page 2000. `EXPLAIN
ANALYZE` showed a sequential scan of 16 to 20 ms. An index (a trigram one, for `LIKE '%x%'`) needs a measured problem
and an ADR of its own.

## Consequences

- Wire: one new operation; `services-api.d.ts` is regenerated in this change.
- `ARCHITECTURE` §5, the `agenza-backend-slice` skill (`persistence.md`) and §10 are corrected: text matching on a
  value-object column goes through a generated string column, and the clients list is the reference for list, paging
  and search.
- `count` and the page are two statements without a transaction, so with concurrent writes the total and the page
  can disagree, as in the other lists.
- The InMemory persistence tests do not compute generated columns: they fill the three columns the way PostgreSQL
  would, and a model test pins the expressions. What the real columns produce was verified by hand.
- Accent-insensitive search is a known limit. `jose` does not find `José`; typing the accent does.
- The frontend (#155 screen) is another change. It sends `status` and `q` as plain strings and branches on the error
  codes above.

Verified by hand on a disposable PostgreSQL 18.3 (`agenza-scratch-pg`, port 5433, `log_statement=all`), with the real
identity and services on private ports and a real login, 89 checks: the default list, the exact item keys and values
(whole CPF, `null` for the absent fields), the three situations and their case, a blank and a numeric `status`;
name, e-mail, masked and partial CPF searches; `%`, `_` and `\` as literal characters; a term with quotes; a long
term; paging with no repeat or omission and a stable total; ties of the same name ordered by id; a page past the
last; every validation code; `401` without a token and `403` for another tenant's header; people of another tenant,
inactive and soft-deleted people never leaking into a list, a total or a search; and a list writing nothing. The
migration was applied over five legacy rows (mixed-case name and e-mail, no e-mail, no CPF, inactive, deleted,
another tenant), reverted and applied again, with the rows intact in between.

## Considered and rejected

- **Masking the CPF in the backend** (`***.456.789-**`, the format of the Portal da Transparência, under `cpf` or
  `maskedCpf`, or revealing only three digits). The first recommendation; the owner decided against masking.
- **`status` as an enum bound by MVC.** English message and the generic code.
- **Ordering or matching by an expression over the value-object column**, and a **string alias property on the
  same column.** Neither translates (see Context).
- **Exact match only for the CPF or the e-mail, or a prefix match.** Cheaper (fewer or no extra columns) but the
  owner chose "contains" in the three; a prefix would miss the surname.
- **An accent-insensitive normalization**, by `lower(translate(...))` (the character list would live in the migration
  and again in .NET, and the two could drift) or by the `unaccent` extension (a `CREATE EXTENSION` in the infra init,
  an `IMMUTABLE` wrapper to fit a generated column, a new mechanism). Nobody asked for it yet.
- **One combined `SearchText` column.** A term with a space could match across two fields.
- **`EF.Functions.ILike` with an escape character.** It cannot reach a value-object column.
- **A fixed cap on the page** instead of the offset rule. Any number is arbitrary.
- **Fixing the offset in `RepositoryBase.ListPagedAsync` in this change.** It is a shared project and changes the
  services, tags and categories lists; it deserves its own change.
