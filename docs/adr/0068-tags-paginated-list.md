# ADR 0068 — Tags use the shared paged list contract

Status: accepted (2026-10-20); applies [ADR 0064](0064-paged-reads-page-request-and-paged-result.md)
and [ADR 0065](0065-string-value-objects-in-a-query-or-route.md) to the tags list.

## Context

GET /api/v1/tags returned every matching tag as an array. Clients and services already use a
bounded page with shared paging validation. The user chose to paginate tags on every request,
including when page parameters are omitted.

## Decision

ListTagsQuery extends PagedQuery and builds TagListFilter, a PageRequest with optional Text.
The port receives that filter and returns PagedResult<Tag>; RepositoryBase.ListPagedAsync
counts the filtered rows and applies Skip/Take. The handler maps the page with TagResponse.FromTag.
The controller declares ApiResponse<PagedResult<TagResponse>>.

Defaults and limits remain those of PageRequest: page 1, page size 20, maximum 100.
The validator writes its own three rules with the shared Paging.* codes, as in ListClients.
A page beyond the last is successful with empty items and the real total.

The touched search is converted from string/ILike to SearchText and literal Contains over
the existing generated NameNormalized column, following ARCHITECTURE §10. No schema change
is needed. Search is trimmed, lowercased and bounded by SearchText; % and _ match themselves.
The existing order by Name is retained and ends in Id for a unique tie-breaker.
Tenant and soft-delete scoping remain the DbContext's responsibility for both count and items.

## Consequences

- This replaces data: TagResponse[] with data: { items, totalCount, page, pageSize }.
  The unpaged mode is removed by the user's explicit choice.
- Frontend types must be regenerated from the final live OpenAPI document.
  The existing tagsRepository.list and tags screen consume an array and need a separate
  frontend integration before the new backend and that screen can be used together.
- Search now has the shared length limit and literal wildcard semantics. A blank optional
  search remains no filter through the shared binding contract.
- No new abstraction, package, index, migration or tenant parameter is introduced.
- Unit tests cover filter mapping, paging rules, response mapping and metadata; EF persistence
  tests cover filtered totals, page traversal, literal search, no tracking and tenant/soft-delete
  isolation. InMemory does not prove PostgreSQL collation or SQL translation.

## Alternatives considered

An optional unpaged mode was considered and rejected by the user. Manual offset/count plumbing
would duplicate the shared implementation. Fetching all pages inside the frontend repository
would preserve an old assumption while hiding the bounded contract, so that workaround is not added.
