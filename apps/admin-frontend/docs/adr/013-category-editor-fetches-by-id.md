# ADR 013 — Category editor fetches by id

**Status:** Accepted; supersedes ADR 012's outlet-context detail

## Decision

- Edit mode loads `GET /api/v1/categories/{id}` through
  `catalog.getCategory`; it does not derive the record from the list response.
- `CategoriesListPage` renders a plain nested outlet and does not pass editor
  state through router context.
- Returning from a create or edit route to `/categories` refreshes the list,
  including after cancellation.

## Rationale

The by-id endpoint is tenant-scoped and removes an implicit, untyped dependency
between the editor and an already-loaded collection. An unconditional refresh
costs one avoidable request after cancellation but keeps list consistency and
navigation state simple.

## Consequences

A missing or cross-tenant id produces the curated not-found result from the
real by-id request. The editor and list can be tested independently, while
route-level tests still cover load, retry, save, cancel, and return behavior.
