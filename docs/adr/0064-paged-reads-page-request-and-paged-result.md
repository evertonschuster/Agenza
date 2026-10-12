# ADR 0064 — Paged reads: one page request in, one paged result out

Status: accepted (2026-10); extends [ADR 0061](0061-validators-write-their-own-rules.md) (the validator keeps writing
its own rules) and [ADR 0063](0063-clients-list-and-search-contract.md) (the first list to use it)

## Context

Two lists are paged: services and, with #155, clients. Each one repeated the same plumbing:

- the port took `int page, int pageSize` and returned a tuple `(Items, TotalCount)`;
- `RepositoryBase.ListPagedAsync(order, page, pageSize)` computed the offset in `int`, so the older list
  `GET /api/v1/services?page=2147483647&pageSize=100` answers `500 Unexpected.Error` and `page=43000000` silently
  computes an offset of 5,032,604 instead of 4,299,999,900;
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
error codes below and `OffsetFits(page, pageSize)`, the one formula the validators and the constructor share.

**`RepositoryBase.ListPagedAsync(PageRequest, filterAndOrder, ct)`** returns `PagedResult<TEntity>`: the items, the
real total, and the page and size it was asked for. The filter-and-order function is required: a page without an
explicit order is a bug.

**`PagedResult<T>.Map(...)`** converts the items and keeps the total, the page and the size, so a handler is
`repository.ListAsync(new PageRequest(query.Page, query.PageSize), <filters>, ct)` followed by
`.Map(<Entity>ListItemResponse.From<Entity>)`.

**The port** of a paged list is `ListAsync(PageRequest page, <plain filters>, ct)` returning `PagedResult<Entity>`.
The filters stay plain values per port: ids, value objects, strings, a status. Nothing generic filters for the
repository (see below).

**Validation** stays in each validator ([ADR 0061](0061-validators-write-their-own-rules.md)): the limits come from
the constants of `PageRequest`, and the three rules carry codes that every list shares, so a client branches once:

| Rule | Code |
| --- | --- |
| `page` at least 1 | `Paging.PageInvalid` |
| `pageSize` from 1 to `MaxPageSize` | `Paging.PageSizeInvalid` |
| `(page - 1) * pageSize` fits an `int` | `Paging.PageTooLarge` |

A page whose offset does not fit an `int` is a `400`, not an empty page: the client asked for something no table
holds, and the error says so.

**The query stays flat.** `ListClientsQuery` keeps `Page` and `PageSize` as members, with `PageRequest` constants as
defaults, because the wire is `?page=&pageSize=`. The handler builds the `PageRequest`.

**Only clients adopt it for now.** `ServiceRepository` and `ListServicesQueryHandler` keep the older
`ListPagedAsync(order, page, pageSize)`, which stays beside the new overload and shares its private slice-reading
step, so services behave exactly as before, including the two wrong answers above. Converting services means a
`PageRequest` in its port, a `Map` in its handler and the three rules with the shared codes in its validator.

## Consequences

- `Admin.SharedKernel.EntityFrameworkCore` now references `Admin.SharedKernel`, the direction that cannot leak EF
  into Application (`Admin.SharedKernel` has no EF reference). `identity-service`'s Infrastructure already received it
  through its Application project.
- Clients' error codes for the page rules are `Paging.*`, not `Client.Page*`. The frontend does not branch on the
  services codes, so nothing there changes; the codes only existed on this unmerged branch for clients.
- Two ways to page exist in `RepositoryBase` until services is converted. The older one is the only unguarded one.
- A repository test cannot live in `Admin.SharedKernel.Tests` (it has no EF). The paged helper is proven through the
  clients persistence tests (items, total, echoed page and size, a page past the last, no repeat or omission).
- The frontend's generated types do not change: `PagedResult<T>` has the same schema.

Verified on the same disposable PostgreSQL 18.3 as [ADR 0063](0063-clients-list-and-search-contract.md), on the final
code: the 89 checks of the clients list with the `Paging.*` codes and a page echoed from the repository's answer;
eleven checks that the services list did not change (five services created, paging with no repeat or omission, search,
a page past the last, `page=0` still `400`, and the `500` of `page=2147483647` still there); the volume run again with
50,000 people (30 to 45 ms at the median, 133 ms at page 2000); and the generated frontend types equal to a fresh
generation. `PageRequest` and `PagedResult.Map` have unit tests in `Admin.SharedKernel.Tests`.

## Considered and rejected

- **A shared `PagedQueryValidator` (`Include`) over an `IPagedQuery` interface.** One source for the rules, but it
  reopens [ADR 0061](0061-validators-write-their-own-rules.md) and adds an interface to the kernel for three
  one-line rules.
- **A filter object or specification passed to the repository** (`ListAsync(PageRequest, ISpecification<T>)`, or an
  `Expression<Func<T, bool>>`). It is what "filter any request" suggests, but the architecture keeps ports to plain
  values ([ARCHITECTURE](../../backend/docs/ARCHITECTURE.md) §5): each list has its own filters, and the repository
  stays the seam that knows how to apply them.
- **A base query record with `Page` and `PageSize`.** Binding positional members inherited through `[FromQuery]`
  and a base type on every query go against "no base handler, no generic CRUD".
- **Clamping to an empty page in the helper, and dropping `Paging.PageTooLarge`.** Safe by construction for every
  future list; the owner preferred the explicit `400`.
- **Codes per feature** (`Client.PageInvalid`, `Service.PageInvalid`). The same rule would have a code per list.
- **Converting services in the same change.** It touches an older slice and the `GET /services` contract inside the
  #155 change; it is a change of its own.
