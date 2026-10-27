---
name: agenza-testing
description: Select and write admin-frontend tests, diagnose coverage failures, and verify async page, session or routing behavior with Vitest, Testing Library or the real-stack Playwright suite.
---

# Test the admin frontend

Choose a test that would fail for the behavior or risk being changed. Read
[references/patterns.md](references/patterns.md) only for the relevant seam. The executable sources
are [vitest.config.ts](../../../apps/admin-frontend/vitest.config.ts),
[playwright.config.ts](../../../apps/admin-frontend/playwright.config.ts) and
[package.json](../../../apps/admin-frontend/package.json).

## Select the boundary

- Pure domain rule, reducer or formatter: a unit test with fixtures, without React or mocks.
- Module store: test its public snapshot, notifications and reset behavior; isolate singleton state.
- Hook lifecycle or async race: `renderHook` with only the provider it requires.
- Page, form or route behavior: render the page with its required router/providers and assert the
  visible consequence. A page shell can still miswire an action or accessible name.
- Real login, cross-service flow or browser accessibility: use the Playwright suite against Aspire.

Test the hook directly when that isolates a lifecycle rule. Test through the page when interaction,
rendering, navigation or form wiring is the risk. Do not add tests solely to increase coverage or
retest a third-party implementation.

## Reuse the existing setup

Keep tests colocated. Inspect [vitest-setup.ts](../../../apps/admin-frontend/src/vitest-setup.ts)
before adding environment or browser API stubs, and reuse the helpers in
[src/test/](../../../apps/admin-frontend/src/test).

In page, component and repository tests, mock the module boundary with `vi.mock`/`vi.hoisted`, or
pass a fake to an existing factory. Do not introduce browser-traffic interception in page or
component tests. At the API-client transport boundary, stub `fetch` to inspect request headers or
cancellation, as in [apiClient.test.ts](../../../apps/admin-frontend/src/shared/api/apiClient.test.ts).
A mock path resolves from the test file. Reset affected singleton state, captured handlers and
mock implementations as needed so one case cannot drive the next.

Use `userEvent.setup()` for interactions and accessible roles/pt-BR names for UI assertions. Use
`StrictMode` when proving behavior affected by repeated mount effects; it is not a wrapper required
for every test. For races, control promise resolution instead of waiting on a real clock.

## Diagnose coverage

Read `coverage.include`, `coverage.exclude` and thresholds from
[vitest.config.ts](../../../apps/admin-frontend/vitest.config.ts). `shared/ui/` is not excluded as a
whole: exclusions name particular files or component folders. Do not move behavior to an excluded
file, expand exclusions or lower thresholds to make a change pass. An excluded renderer can still
need a behavior or accessibility test. Keep test assertions tied to an observable effect, not class
snapshots or render-only checks.

## Run the relevant checks

Use the scripts in [package.json](../../../apps/admin-frontend/package.json) and the requirements of
[frontend CI](../../../.github/workflows/frontend-ci.yml). Diagnose a failing targeted test first,
then run the applicable gate for the change; report the checks actually executed.

Playwright uses the real Aspire stack and seeded login. Follow
[README.md](../../../apps/admin-frontend/README.md) for startup and reuse
[e2e/helpers.ts](../../../apps/admin-frontend/e2e/helpers.ts) for login. The suite's worker and server
settings are owned by `playwright.config.ts`; do not start a competing frontend server or replace
the authenticated flow with mocks. Obtain seeded login credentials through `e2e/helpers.ts`, which
reads development configuration. Read generated tenant/entity ids from the current session or
responses instead of hardcoding them.
