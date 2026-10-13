# ADR 0064 — Paged reads: one page request in, one paged result out

Status: accepted (2026-10); extends [ADR 0061](0061-validators-write-their-own-rules.md) (the validator keeps writing
its own rules) and [ADR 0063](0063-clients-list-and-search-contract.md) (the first list to use it)

## Context

Two lists are paged: services and, with #155, clients. Each one repeated the same plumbing:

- the port took `int page, int pageSize` and returned a tuple `(Items, TotalCount)`;
- `RepositoryBase.ListPagedAsync(order, page, pageSize)` computed the offset in `int`, so the older list
  `GET /api/v1/services?page=2147483647&pageSize=100` answered `500 Unexpected.Error` and `page=43000000` silently
  computed an offset of 5,032,604 instead of 4,299,999,900;
- the handler rebuilt the `PagedResult<T>` envelope by hand from the tuple and the query;
- each validator wrote the limits as literals (`1`, `100`) and, for services, with the validator library's internal
  codes.

The next paged read would copy all of it. The change asks for the same behaviour to be reusable: the object the
repository receives, and the repository operation itself.

## Decision

**`PageRequest(Page, PageSize)`**, in `Admin.SharedKernel` next to `PagedResult`, is what a paged read hands to the
repository. Building one that cannot be served throws `ArgumentOutOfRangeException` (page below 1, size below 1, an
offset that does not fit an `int`): a programmer-error guard, because the validator already refused those inputs
with a `400`. It exposes `Offset`, the limits (`FirstPage` 1, `DefaultPageSize` 20, `MaxPageSize` 100), the stable
error codes below and `OffsetFits(page, pageSize)`, the one formula the validators and the constructor share. It is
not `sealed` on purpose: the filter of a list extends it (below), so the guard comes with the page.

**`RepositoryBase.ListPagedAsync(PageRequest, filterAndOrder, ct)`** returns `PagedResult<TEntity>`: the items, the
real total, and the page and size it was asked for. The filter-and-order function is required: a page without an
explicit order is a bug.

**`PagedResult<T>.Map(...)`** converts the items and keeps the total, the page and the size, so a handler is
`repository.ListAsync(query.ToFilter(), ct)` followed by `.Map(<Entity>ListItemResponse.From<Entity>)`.

**The filter of a list extends it.** A paged list has one record, `ClientListFilter : PageRequest`, that carries the
page and the plain filters of that list (`Text`, `CpfDigits`, `Status`): one object from the handler to the
repository, where a new criterion is one more property and not one more parameter. Its `Create` normalizes what comes
from the query (the search text, the digits of the CPF) and the base constructor keeps the guard. The port is
`ListAsync(ClientListFilter filter, ct)` returning `PagedResult<Client>`, and the adapter hands the filter to
`ListPagedAsync(filter, filterAndOrder, ct)`, which reads only the page from it. The filter holds plain values: no
expression, no specification, nothing generic (see below). Only the filter of a list extends `PageRequest`; a query or
a command never does, because they carry unvalidated input and have to be buildable with any number.

**Validation** stays in each validator ([ADR 0061](0061-validators-write-their-own-rules.md)): the limits come from
the constants of `PageRequest`, and the three rules carry codes that every list shares, so a client branches once:

| Rule | Code |
| --- | --- |
| `page` at least 1 | `Paging.PageInvalid` |
| `pageSize` from 1 to `MaxPageSize` | `Paging.PageSizeInvalid` |
| `(page - 1) * pageSize` fits an `int` | `Paging.PageTooLarge` |

A page whose offset does not fit an `int` is a `400`, not an empty page: the client asked for something no table
holds, and the error says so.

**A paged query extends `PagedQuery`.** `PagedQuery`, in `Admin.SharedKernel`, is an abstract record with `Page` and
`PageSize` as `init` properties that default to the `PageRequest` constants, and no guard: it holds the raw input, and
the validator is the gate. `ListClientsQuery` extends it and declares only its own members (`Search`, `Status`), so the
wire stays flat (`?page=&pageSize=&search=&status=`), a new list does not redeclare the two members or their defaults,
and a paging value is set with an initializer (`new ListClientsQuery { Page = 2 }`). The query turns itself into its filter
with a `ToFilter()` extension method, the mapping pattern of [ARCHITECTURE](../../backend/docs/ARCHITECTURE.md) §2
(`ToModel`, `To<Entity>Data()`), so the handler stays orchestration and the mapping of the wire enum `ClientStatusFilter`
to the domain's `ClientStatus?` lives with the query. `PagedQuery` and `PageRequest` are two types on purpose: one is input that may be wrong, the other
is a page a repository can serve. The query is never the filter, and the filter is never bound from the wire.

**Services follows.** The services list was converted after review, in the same pull request, the way clients was:
`ServiceListFilter : PageRequest` (`Search`, `CategoryId`, `TagId`), `ListServicesQuery : PagedQuery`, the port
`ListAsync(ServiceListFilter, ct)`, a `Map` in the handler (which still reads the names of the page's categories in one
query) and the three `Paging.*` rules in its validator. The older `ListPagedAsync(order, page, pageSize)` was removed,
because nothing else called it. `GET /api/v1/services?page=2147483647&pageSize=100` now answers `400 Paging.PageTooLarge`
instead of `500`, and `page=43000000` answers the same `400` instead of a wrong offset. The services order also ends in
the id, so a tie cannot repeat or skip a record. The `Search` of services stays a plain `string?` and its `ILike` pattern
stays unescaped (`%` and `_` are wildcards in it), as before: neither belongs to this change.

## Consequences

- `Admin.SharedKernel.EntityFrameworkCore` now references `Admin.SharedKernel`, the direction that cannot leak EF
  into Application (`Admin.SharedKernel` has no EF reference). `identity-service`'s Infrastructure already received it
  through its Application project.
- Clients' error codes for the page rules are `Paging.*`, not `Client.Page*`. The frontend does not branch on the
  services codes, so nothing there changes; the codes only existed on this unmerged branch for clients.
- The `GET /services` contract changes in two ways: its page errors carry the `Paging.*` codes instead of the validator
  library's internal names (the frontend does not branch on them), and a huge page is a `400` instead of a `500` or a
  wrong page. `RepositoryBase` has one paged read.
- A repository test cannot live in `Admin.SharedKernel.Tests` (it has no EF). The paged helper is proven through the
  clients persistence tests (items, total, echoed page and size, a page past the last, no repeat or omission).
- The frontend's generated types keep the same query parameters; `Page` and `PageSize` come after the list's own
  members in the generated `query` object, because the properties are inherited.
- A filter that extends `PageRequest` is never equal to a plain `PageRequest` of the same page: record equality includes
  the type. A test that wants the filter compares the filter.

Verified on the same disposable PostgreSQL 18.3 as [ADR 0063](0063-clients-list-and-search-contract.md), on the final
code: the 90 checks of the clients list with the `Paging.*` codes and a page echoed from the repository's answer;
forty checks of the converted services list (paging with no repeat or omission and the order of the database, a
case-insensitive and trimmed search, the category and tag filters alone and together with paging, a page past the last,
every `Paging.*` code, `page=2147483647` and `page=43000000` as `400`, no leak of another tenant or of a deleted
service, nothing written by a listing, and an edit followed by the list); the volume run of the clients list with
50,000 people (30 to 45 ms at the median, 133 ms at page 2000); and the generated frontend types equal to a fresh
generation. `PageRequest` and `PagedResult.Map` have unit tests in `Admin.SharedKernel.Tests`.

## Considered and rejected

- **A shared `PagedQueryValidator` (`Include`) over an `IPagedQuery` interface.** One source for the rules, but it
  reopens [ADR 0061](0061-validators-write-their-own-rules.md) and adds an interface to the kernel for three
  one-line rules.
- **A generic filter or specification passed to the repository** (`ListAsync(PageRequest, ISpecification<T>)`, or an
  `Expression<Func<T, bool>>`). It is what "filter any request" suggests, but the architecture keeps ports to plain
  values ([ARCHITECTURE](../../backend/docs/ARCHITECTURE.md) §5): each list has its own filters, and the repository
  stays the seam that knows how to apply them. A record of plain values that belongs to one list is not that.
- **`ListClientsQuery` extending `PageRequest`.** Binding would run the guard on raw input (`?page=0` would throw
  instead of answering `Paging.PageInvalid`), and the handler would hand the port a query carrying the wire's `Search`
  and `Status`. The filter, built after the validator, can extend it.
- **The filter holding a `PageRequest`** instead of extending it. Equally simple; one flat object was preferred, and
  `ListPagedAsync(PageRequest, …)` accepts the filter as it is.
- **The handler building the filter** (the version before the extension): `ClientListFilter.Create(query.Page,
  query.PageSize, query.Search, status)` and a private status mapping in every list handler. Changed after review.
- **The first version of this change**: `ListAsync(PageRequest page, string? text, string? cpfDigits, ClientStatus?
  status, ct)`. It grows by one parameter per criterion, and the text and the digits were one concept in two arguments.
  Changed after review.
- **A base query record with `Page` and `PageSize`** (rejected in the first version, adopted after review). The fears
  were that MVC would not bind inherited members and that a base type goes against "no base handler, no generic CRUD".
  A test of the MVC binder (`PagedQueryTests`) and the live service show that the inherited `init` properties are
  bound from the query string in any case, and that the OpenAPI document keeps the same four parameters (only their
  order changes). The rule is about handlers and CRUD, and a record with two properties is neither.
- **A positional base (`PagedQuery(int Page, int PageSize)`).** A derived positional record has to repeat both
  parameters to bind through its constructor, which is the duplication this removes.
- **Clamping to an empty page in the helper, and dropping `Paging.PageTooLarge`.** Safe by construction for every
  future list; the owner preferred the explicit `400`.
- **Codes per feature** (`Client.PageInvalid`, `Service.PageInvalid`). The same rule would have a code per list.
- **Converting services in a change of its own** (the first plan). It touches an older slice and the `GET /services`
  contract; the owner asked for it in the same pull request, after the clients list was reviewed.
