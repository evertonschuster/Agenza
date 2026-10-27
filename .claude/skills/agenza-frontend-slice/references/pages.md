# Pages, lists and route dialogs

The [architecture](../../../../apps/admin-frontend/docs/ARCHITECTURE.md#1-shape) owns the placement
rules. Use this procedure for the page's lifecycle and route integration.

## Page and route

Keep rendering in the page component and its state, effects and handlers in the page's hook. Start
with the affected page; [useClientFormPage](../../../../apps/admin-frontend/src/features/clients/ui/pages/ClientFormPage/useClientFormPage.ts)
shows a form lifecycle, while
[useTagFormPage](../../../../apps/admin-frontend/src/features/tags/ui/pages/TagFormPage/useTagFormPage.ts)
shows loading and saving inside a route dialog. Create page-local components only when needed;
components shared within the slice belong in its `ui/components/`.

When wiring the route, inspect [routes.tsx](../../../../apps/admin-frontend/src/app/routes.tsx).
Expose the component through the slice barrel, provide the route's `handle` when it needs a page
header, and retain the parent `<Outlet />` when a child dialog must leave the list mounted.
[useCloseRoute](../../../../apps/admin-frontend/src/shared/hooks/useCloseRoute.ts) handles closing
with a fallback for direct navigation.

Choose the data-loading mechanism the screen needs. Existing page hooks load through repositories;
do not rewrite them into loaders or actions merely to follow an illustrative template. If a loader
or action is needed, keep it with the page in `route.ts`, re-export it through the slice barrel,
and use the result boundary described in [api-integration.md](api-integration.md).

## Paginated list

Inspect [useClientListPage](../../../../apps/admin-frontend/src/features/clients/ui/pages/ClientListPage/useClientListPage.ts)
or [useTagListPage](../../../../apps/admin-frontend/src/features/tags/ui/pages/TagListPage/useTagListPage.ts)
before changing list state:

1. Keep filter types and initial query values in the slice's `model/`.
2. Pass the controlled state and repository function to
   [usePaginatedList](../../../../apps/admin-frontend/src/widgets/paginated-list-section/use-paginated-list.ts).
   The page chooses the state source. These route lists use
   [useSearchParamsState](../../../../apps/admin-frontend/src/shared/hooks/useSearchParamsState.ts),
   which reads the initial URL and writes subsequent changes on the owning route.
3. Keep draft form fields separate from applied filters. Submit through `applyFilters`; use the
   hook's pagination actions and `refetch` for their respective operations.
4. Do not add an effect keyed on query state to fetch again. The list hook sends from its actions,
   loads on mount and corrects a page beyond the last one. A controlled-state update alone does not
   trigger a request.
5. Check mutation topics and their subscribers when a successful save or deletion should refresh
   the mounted list. `refetch` retains the displayed result while requesting its replacement.

## Pending work and navigation

A read effect owns an `AbortController`, forwards its signal and ignores an aborted answer.
For editing, associate the loaded data with the route id so an older record is not shown as ready
for a new id. After a mutation, preserve the existing unmount guard around navigation or dialog
closure; an answer arriving after the person leaves must not redirect them back.

Use the loading and error state owned by the chosen mechanism: hook/form state for hook-driven
work, router state for loaders/actions. Reuse the existing form/error mapping rather than adding
a page-level exception wrapper or interpreting message text.

## Verification

Test the changed behavior at its boundary: apply a filter, change a page, close a direct-link
dialog, or leave while a request is pending. Use
[agenza-testing](../../agenza-testing/SKILL.md) for the appropriate test tier and live examples.
