# ADR 012 — Categories uses one URL-driven modal editor

**Status:** Accepted. The outlet-context sharing described below is
superseded by docs/adr/013 - the routed modal editor itself (one Dialog,
two nested routes) is still accurate.

## Decision

Categories separates its collection, creation, and editing workflows into
three routes:

- `/categories` renders the searchable table and delete confirmation;
- `/categories/new` is a nested route that opens the editor in create mode;
- `/categories/:id/edit` is a nested route that opens the same editor in
  edit mode.

`CategoriesListPage` is the route component and composes its controller
hook, responsive table, outlet, and delete confirmation.
Both child routes render `CategoryEditorDialog`. It composes
`useCategoryEditor` with the same `CategoryForm` for creation and editing.
The route parameter selects the operation, title, submit label, initial
values, and mutation.

The list remains a `Table`. On smartphones, record actions use labelled
icons with larger touch targets and the category name can wrap; from the
`sm` breakpoint upward, the action text is also visible.

## Rationale

Creation and editing operate on the same single-field form. Keeping both in
one modal preserves list/search context and avoids parallel components and
hooks for nearly identical workflows. Their nested URLs still provide
direct navigation and browser back/forward behavior without unmounting the
list page.

The parent passes its single `useCategories` source through outlet context.
The editor therefore creates, resolves, and updates against the visible
tenant-scoped source without an independent collection request.

The backend exposes collection listing but no `GET /categories/{id}`.
The editor therefore resolves the requested id from the authenticated
tenant's category collection. A missing id renders a curated not-found
state; it never falls back to data from another tenant.

## Consequences

- `CategoriesListPage` is a composition shell; state machines and use-case
  access remain in focused hooks.
- `useCategoriesListPage` instantiates `useCategories` once and provides it
  to the nested editor through outlet context.
- `useCategoryEditor` owns the shared submit, structured-error,
  loading/not-found, and return-navigation state.
- Closing or submitting either editor mode navigates to `/categories`
  while keeping the current list/search state. Browser back closes it too.
- There are no operation-specific creation route or editing page
  components.
- There is no redundant list route wrapper.
- Route-level regression tests cover shared modal creation/editing,
  direct `/categories/new` access, browser history, preserved list state,
  not-found/loading errors, deletion refresh, responsive action semantics,
  structured field errors, security, and accessibility.

No architecture guard is added because choosing a routed editor or modal
is a product interaction decision, not a generalizable import or
filesystem invariant. The regression tests run through the existing
frontend coverage command in CI.
