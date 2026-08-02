# ADR 013 — Category editor fetches by id directly, no outlet context

**Status:** Accepted

## Decision

- `useCategoryEditor` no longer reads react-router's `useOutletContext`. In
  edit mode it fetches its own category directly through a new
  `GET /api/v1/categories/{id}` endpoint
  (`GetCategoryByIdQuery`/`GetCategoryByIdQueryHandler`, reusing the
  already tenant-scoped `ICategoryRepository.GetByIdAsync` that
  `Update`/`Delete` already relied on). Create/update still call the
  `catalog` facade directly, same as before - they're just no longer
  routed through the list's shared state.
- `CategoriesListPage` no longer builds or passes an `editorContext`
  through `<Outlet context={...}>`; it renders a plain `<Outlet />`.
- `useCategoriesListPage` refetches the category list whenever navigation
  returns from a nested editor route (`/categories/new` or
  `/categories/:id/edit`) back to the bare `/categories` route -
  unconditionally, whether the editor closed via cancel or a successful
  save.

## Rationale

docs/adr/012 shared list state through outlet context specifically
because no `GET /categories/{id}` endpoint existed - the editor had no
other way to resolve an id without depending on the full collection the
list had already loaded. That constraint no longer holds:
`GetByIdAsync` already existed on the repository, so exposing it as its
own tenant-scoped query and endpoint was a small, additive slice, not a
new capability.

`useOutletContext<T>()` is also untyped at the router level - the generic
cast has no runtime guarantee that an ancestor route actually supplied a
value; a route tree change could silently turn it into `undefined` at
runtime while the type system still says otherwise. Fetching directly
removes that coupling instead of trading it for a differently-shaped
implicit channel.

Refetching the list unconditionally on return-to-list is simpler and more
robust than threading a "did this actually mutate anything" flag through
navigation state, at the cost of one avoidable `GET` when the editor is
only cancelled. Categories is a small, infrequently-changing collection -
that cost was judged worth the simplicity.

## Consequences

- `CategoriesEditorContext` (the outlet-context payload type) no longer
  exists; `useCategoriesListPage.types.ts` only describes the list's own
  view model.
- The editor's not-found state is now a real 404
  (`AppError.code === 'notFound'`) instead of "id absent from an
  already-loaded collection." Behaviorally equivalent: the lookup is
  still tenant-scoped, so an id belonging to another tenant still renders
  the curated not-found state, never another tenant's data.
- `useCategoryEditor` and `useCategoriesListPage` no longer need each
  other to be tested or reasoned about - the editor doesn't require a
  full route tree wrapping it in `<Outlet context={...}>` to exist.
- One extra `GET /api/v1/categories` fires whenever the editor route
  closes back to the list, including on cancel. Accepted per Rationale
  above.
- Route-level regression tests (`CategoriesRoutes.test.tsx`) stub
  `catalog.getCategory` directly for edit-mode load/not-found/retry
  scenarios instead of shaping `catalog.listCategories` to produce them.
