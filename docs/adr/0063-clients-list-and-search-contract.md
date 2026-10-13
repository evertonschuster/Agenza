# ADR 0063 — Clients: list and search contract

Status: accepted (2026-10); extends [ADR 0044](0044-clients-aggregate-uniqueness-and-conflict-contract.md) (the
situation) and [ADR 0060](0060-clients-read-by-id-contract.md) (the CPF on the wire); corrects the guidance of
[`ARCHITECTURE`](../../backend/docs/ARCHITECTURE.md) §5 on `EF.Property<string>` over a value-object column

## Context

#155 adds `GET /api/v1/clients?page=&pageSize=&search=&status=` to list and search the people a business serves. The
client aggregate, the situation, the soft-delete and tenant filters and the paged-list shape (`PagedResult<T>`)
already existed. Open were: the shape of a list item, whether the CPF is masked, what `search` matches, what "normalized
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

**Endpoint.** `GET /api/v1/clients` with `page` (from 1), `pageSize` (default 20, 1 to 100), `search` and `status`. It
answers `200` with `ApiResponse<PagedResult<ClientListItemResponse>>`: `items`, `totalCount`, `page`, `pageSize`.
The members of the query are `Page`, `PageSize`, `Search` and `Status`: a validation error is keyed by the property path
in camelCase, so the member is named after the wire parameter. The OpenAPI document lists the parameters in
PascalCase, like every other list, and the binding is case-insensitive. The search parameter is `search`, as in the
services, tags and categories lists, and not the `q` the issue #155 wrote; the text of the issue needs the same update
as the CPF. The old `?q=` is not an error: nothing binds it and the list is not filtered.

**The item.** `ClientListItemResponse`: `id`, `fullName`, `birthDate`, `phone`, `email`, `cpf`, `status`. No
guardians, reference contacts or notes, no `age` (ADR 0060). The mapping reads the root only, but the repository still
returns each client whole, with its guardians and reference contacts, in the shape `GetByIdAsync` loads: `UpdateAsync`
stages the contacts the root holds in memory, so a client read from a page without them and saved would lose them.

**The CPF is not masked.** It comes whole, digits only, as the detail returns it. This is a product decision of the
owner on 2026-10-12, taken against the text of #155 ("Mascarar CPF na lista") and the criterion of the parent #139
("CPF não aparece integralmente em listagens"); both need to be reconciled with it. It follows ADR 0060: the project
has no roles, every authenticated user of the tenant sees the whole CPF in the detail, and the list adds no new kind
of reader. What changes is volume: up to 100 whole CPFs per response.

**Situation.** `status` is a plain enum, `ClientStatusFilter { Active = 1, Inactive = 2, All = 3 }`, named in
camelCase on the wire ([ADR 0058](0058-closed-set-members-are-plain-enums.md)): `active` (default), `inactive` or
`all`, in any case. Omitted or blank is `active`. `all` is "no restriction", and soft-deleted people never appear,
whatever the value. `ClientStatus` cannot be the type: it has no `All` and it is persisted. The generated contract
publishes `'active' | 'inactive' | 'all'`.

The binder, not the validator, answers a bad value. The kernel reads an enum from a query by exactly one name
([ADR 0066](0066-enums-read-from-a-query-or-a-route-by-one-name.md)), so an unknown name, a number (`status=3`, even
the number of a member) or a joined list (`active,inactive`) fails at binding (gate 1) with `400 Validation.Failed` under
`status` and the message "O valor informado deve ser active, inactive ou all.". The validator has no rule for `status`.

**Search.** `search` is a `SearchText` ([ADR 0065](0065-string-value-objects-in-a-query-or-route.md)): the framework reads
it from the query string trimmed and lowercased, and a blank one is absent, which means no search. The handler matches
it as "contains":

- in the name and in the e-mail;
- in the CPF digits too, when the term without `.`, `-` and spaces is only digits. A masked `529.982.247-25` finds
  that person; `982` finds the CPFs that contain 982 and, as any term, the names and e-mails that contain it.

The three matches are joined by "or" and combined with the situation by "and". A person with no e-mail and no CPF is
found by name. The search is part of the list's filter, `ClientListFilter` ([ADR 0064](0064-paged-reads-page-request-and-paged-result.md)): the
query's `ToFilter()` derives two values: `Text`, from the `SearchText` of `query.Search`, and `CpfDigits`, a `string?`
with the digits of the term without the CPF mask, from one to eleven ASCII digits, and absent for anything else. The mask
is removed by `CpfNumber.StripMask`, the same method that `CpfNumber.Create` uses, so the search and the registration accept
the same mask; the rule of one to eleven digits is the query's own. A digit
string longer than a CPF cannot be part of one, so it simply does not search the CPF (the name and the e-mail are still
searched). The
repository port takes the filter.

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
of `Tag` and `Category` sends `ESCAPE ''`, so `%` and `_` are wildcards there; the services list moved to the same
`Contains` over its own `NameNormalized` in [ADR 0064](0064-paged-reads-page-request-and-paged-result.md).) PostgreSQL fills the columns for existing rows when the migration runs, and `Down` drops only them. Each
client load now reads three more short strings, because EF loads every mapped column of an entity.
`lower()` follows the database ctype, as it already does for the service names.

**Validation.** Gate 2, with the codes below and pt-BR messages naming the field:

| Rule | Code |
| --- | --- |
| `page` at least 1 | `Paging.PageInvalid` |
| `(page - 1) * pageSize` fits an `int` | `Paging.PageTooLarge` |
| `pageSize` from 1 to 100 | `Paging.PageSizeInvalid` |

`status` has no validator rule: the binder reads one member or refuses the value (above). `search` has no validator rule: `SearchText` refuses a term past 254 characters, the longest searchable value (an e-mail), at
binding (gate 1), as `400 Validation.Failed` under `search` with its own pt-BR message.

The three page rules are shared by every paged list ([ADR 0064](0064-paged-reads-page-request-and-paged-result.md)).
`Paging.PageTooLarge` exists because the offset `(page - 1) * pageSize` has to fit an `int`: before the services list was
converted ([ADR 0064](0064-paged-reads-page-request-and-paged-result.md)), `GET /api/v1/services?page=2147483647&pageSize=100`
answered `500 Unexpected.Error`, and `page=43000000` silently computed an offset of 5,032,604 instead of 4,299,999,900,
so a large enough table would have answered a wrong page instead of an empty one. A framework binding failure (`page=abc`)
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
- The page statement also reads the guardians and reference contacts of its clients, in one query like
  `GetByIdAsync`: the page is limited in a subquery and the contacts are joined to it. Measured again with them, on
  50,003 people with 28,576 guardians and 12,861 reference contacts: 25 to 45 ms at the median, 63 ms at page 2000.
- The InMemory persistence tests do not compute generated columns: they fill the three columns the way PostgreSQL
  would, and a model test pins the expressions. What the real columns produce was verified by hand.
- Accent-insensitive search is a known limit. `jose` does not find `José`; typing the accent does.
- The frontend (#155 screen) is another change. It sends `status` (the generated union) and `search` and branches on the error
  codes above; a bad `status` cannot come from its typed client.

Verified by hand on a disposable PostgreSQL 18.3 (`agenza-scratch-pg`, port 5433, `log_statement=all`), with the real
identity and services on private ports and a real login, 97 checks on the list: the default list, the exact item keys and values
(whole CPF, `null` for the absent fields), the three situations and their case, a blank `status`, an unknown name, a joined list, `0` and `7`, and a member given as a number;
name, e-mail, masked and partial CPF searches; `%`, `_` and `\` as literal characters; a term with quotes; a term past
the limit (refused at binding, with the message of the value object and without echoing it), a padded one of exactly
254 characters, `search` given twice, `?Search=` in another case and the old `?q=` ignored; paging with no repeat or omission and a stable total; ties of the same name ordered by id; a page past the
last; every validation code; `401` without a token and `403` for another tenant's header; people of another tenant,
inactive and soft-deleted people never leaking into a list, a total or a search; and a list writing nothing. The
migration was applied over five legacy rows (mixed-case name and e-mail, no e-mail, no CPF, inactive, deleted,
another tenant), reverted and applied again, with the rows intact in between, and all three migrations were applied
from an empty database when the service started. Ten more checks cover the edit, deactivate and reactivate path with
the generated columns present: they follow a rename, a new CPF and a new e-mail, and the list order follows them.

## Considered and rejected

- **Masking the CPF in the backend** (`***.456.789-**`, the format of the Portal da Transparência, under `cpf` or
  `maskedCpf`, or revealing only three digits). The first recommendation; the owner decided against masking.
- **`status` as a string checked by the validator** (the first version of this change). A pt-BR message with a code of
  its own, but three constants, a list of known words and string comparisons in the handler, a contract that said
  `string`, and a rule that ADR 0058 already settles for every enum. Changed after review.
- **Enum values chosen as bits (`1, 2, 4`) and an `IsInEnum` rule with `Client.StatusFilterInvalid`** (the version
  before this one). The framework's parser joins comma-separated names with an OR, so the values had to keep every join
  off the members (with `1, 2, 3`, `active,inactive` became `all`), a convention each filter would have to remember, and
  a number that is a member (`status=4`) was still accepted. The kernel's binder replaced it
  ([ADR 0066](0066-enums-read-from-a-query-or-a-route-by-one-name.md)).
- **Ordering or matching by an expression over the value-object column**, and a **string alias property on the
  same column.** Neither translates (see Context).
- **Exact match only for the CPF or the e-mail, or a prefix match.** Cheaper (fewer or no extra columns) but the
  owner chose "contains" in the three; a prefix would miss the surname.
- **An accent-insensitive normalization**, by `lower(translate(...))` (the character list would live in the migration
  and again in .NET, and the two could drift) or by the `unaccent` extension (a `CREATE EXTENSION` in the infra init,
  an `IMMUTABLE` wrapper to fit a generated column, a new mechanism). Nobody asked for it yet.
- **`CpfNumber` as the type of the CPF digits.** It validates the check digits, so it refuses every fragment (`123`,
  `456.789`, even ten correct digits). Its `Restore` skips the validation, but it exists for EF to read what is stored, and
  using it for a fragment would break the invariant of the type.
- **A `CpfDigits` value object in the Application** (tried after review): a record whose `Create` held the extraction.
  It had one producer (`ToFilter()`) and one reader (the repository, through `.Value`), and no invariant beyond the
  extraction itself, so it added a type without adding a guarantee. Removed after review; the extraction is a private
  method of the query.
- **A copy of the mask rule in the query** (the version before this one). The query repeated, character for character,
  the private `StripMask` of `CpfNumber`, on the argument that the kernel needs a second real caller. `CpfNumber.Create` is
  the first one and the query the second, and a mask accepted by one and not by the other would register a CPF that the
  search cannot find from the same text. `StripMask` became public; only the mask is shared, not the fragment rule.
- **Client roots without their contacts in the page** (the first version of this change). Two joins fewer, but the port
  returned a `Client` that looked whole and was not: a client from the page, inactivated and staged with `UpdateAsync`,
  lost every guardian and reference contact on save (a persistence test now pins the opposite). Changed after review.
- **A split query for the two collections of the page.** An optimization without a measured problem; `GetByIdAsync`
  loads them in one query too.
- **One combined search column.** A term with a space could match across two fields.
- **`search` as a plain string normalized in the handler** (the first version of this change). The rule sat in the use case and
  in a validator rule instead of in a type; changed after review (ADR 0065).
- **`EF.Functions.ILike` with an escape character.** It cannot reach a value-object column.
- **A fixed cap on the page** instead of the offset rule. Any number is arbitrary.
- **Fixing the offset of the older `RepositoryBase.ListPagedAsync(order, page, pageSize)` on its own.** The conversion of
  the services list to `PageRequest` removed that helper (ADR 0064).
