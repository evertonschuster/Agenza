# Frontend testing conventions

Read this reference only when creating or changing tests, fakes, wrappers, MSW
handlers, or test infrastructure.

## Strategy by boundary

| Subject | Test boundary |
| --- | --- |
| Domain | Pure inputs and `Result` outputs; no mocks |
| Application orchestration | Hand-written repository fake |
| Infrastructure repository | MSW around the real `HttpClient` |
| Hook/component | Typed fake `AppContainer`; router/auth providers only as needed |

Do not mix boundaries. A use-case test does not need MSW; a repository test does
not replace `HttpClient` with a repository fake.

## Fakes

- Start from the current `createFake*Repository` or
  `createFakeAppContainer` helper.
- Default unused expected operations to resolved `Result.failure` values, not
  `Promise.reject`. This application represents expected failures as values.
- Override only the operation under test and use `vi.fn` when call assertions
  matter.
- Add a shared feature fake after a second test needs the same complete shape.

## TypeScript and React

- Constructor fields are explicit; optional properties use conditional spreads.
- Type render helpers explicitly when inference would lose the subject's public
  result type.
- Give wrapper/render helpers explicit return types when ESLint requires them.
- A never-resolving promise for an in-flight state uses a non-empty executor or
  the narrow documented lint suppression; do not generalize a suppression.
- Use `waitFor` for observable async state and `act` around direct state-causing
  calls. Wait for the initial auth check before asserting authenticated content.

## MSW and accessibility

- Every request has a registered handler and `onUnhandledRequest: 'error'`
  remains enabled.
- Test wire shapes, request bodies, and relevant error variants at the HTTP
  boundary.
- Add `jest-axe` to new or materially changed routed pages/forms, alongside
  keyboard/focus assertions where behavior depends on them.

Run targeted Vitest files during development, then the complete format, lint,
build, and coverage gates from `apps/admin-frontend/AGENTS.md`.

