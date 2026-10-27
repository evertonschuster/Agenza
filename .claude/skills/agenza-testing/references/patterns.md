# Test seams and live examples

Open the example matching the change. Copy the seam and assertion strategy, not an entire fixture
or an old feature's assumptions.

## Pure rules and stores

[sessionMachine.test.ts](../../../../apps/admin-frontend/src/shared/session/sessionMachine.test.ts)
tests the reducer with plain principal fixtures, without identity-provider wiring. Use table cases
when several inputs exercise the same rule. Reuse
[oidcUser.ts](../../../../apps/admin-frontend/src/test/oidcUser.ts) for principal/token construction.

[sessionStore.test.ts](../../../../apps/admin-frontend/src/shared/session/sessionStore.test.ts)
resets the store and mocks between cases, then verifies snapshots, subscription/unsubscription and
credential reads. Reset state as well as call history. Restore fake timers after a test that changes
the clock. For OS-theme behavior,
[themeStore.test.ts](../../../../apps/admin-frontend/src/shared/theme/themeStore.test.ts) supplies a
controllable media query; the global setup stub alone does not simulate preference changes.

## Events and async races

[AuthProvider.test.tsx](../../../../apps/admin-frontend/src/features/auth/ui/AuthProvider.test.tsx)
captures event callbacks in `vi.hoisted`, registers them through a mocked auth module and fires them
inside `act()`. Clear the captured callbacks as well as store state between tests.

Use [pending.ts](../../../../apps/admin-frontend/src/test/pending.ts) to resolve requests in a chosen
order. Assert the consequence of a stale answer, unmount or competing event, rather than merely
asserting that an abort function was called.
[use-paginated-list.test.tsx](../../../../apps/admin-frontend/src/widgets/paginated-list-section/use-paginated-list.test.tsx)
shows controlled list state, immediate requests from actions, cancellation and a corrected last
page. A state update alone must not accidentally become a second fetch trigger.

## Pages and navigation

[ClientListPage.test.tsx](../../../../apps/admin-frontend/src/features/clients/ui/pages/ClientListPage/ClientListPage.test.tsx)
renders the list with a data router and mocks its repository. Use
[renderRoutes.tsx](../../../../apps/admin-frontend/src/test/renderRoutes.tsx) when the component
depends on route matches/handles; a plain `MemoryRouter` cannot supply every data-router API.
Assert the destination or visible outcome instead of spying on router internals.

[LoginPage.test.tsx](../../../../apps/admin-frontend/src/features/auth/ui/pages/LoginPage/LoginPage.test.tsx)
uses `StrictMode` to verify a single login redirect despite repeated development effects. Use that
wrapper for this failure mode; ordinary list loading may legitimately start and abort a development
mount request before starting the next one.

For a form or dialog, use `userEvent.setup()` to operate the actual control and assert its effect:
validation displayed, submission suppressed, successful save or closure. A render-only test does
not prove the action works. Use accessible names; reserve test ids for values without an accessible
query.

## API transport seam

[tagsRepository.test.ts](../../../../apps/admin-frontend/src/features/tags/api/tagsRepository.test.ts)
tests typed delegation by mocking `servicesApi` and checking request parameters and returned
results. A failing API result remains a value.

[servicesFacade.test.ts](../../../../apps/admin-frontend/src/shared/api/servicesFacade.test.ts)
passes a fake client to the factory. Inspect those cases when changing envelope or failure
normalization, rather than reproducing their taxonomy in each feature test. Header/session wiring
is tested at [apiClient.test.ts](../../../../apps/admin-frontend/src/shared/api/apiClient.test.ts).

## Real-stack flows

Use [e2e/helpers.ts](../../../../apps/admin-frontend/e2e/helpers.ts) for seeded login. It reads the
identity service's development configuration instead of copying credentials. Examples live in
[auth.spec.ts](../../../../apps/admin-frontend/e2e/auth.spec.ts),
[clients.spec.ts](../../../../apps/admin-frontend/e2e/clients.spec.ts) and
[tags.spec.ts](../../../../apps/admin-frontend/e2e/tags.spec.ts).

Keep the real stack and login flow. Derive generated ids from the session or response, wait for an
observable state, and use reloads where they prove persistence. When checking logout, verify that
the credentials form is reached again; a navigation that silently restores the session does not
prove logout.
