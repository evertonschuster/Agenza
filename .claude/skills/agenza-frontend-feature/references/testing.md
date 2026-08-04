# Frontend testing conventions

Read only when changing tests, fakes, wrappers, MSW handlers, or test
infrastructure.

| Subject | Boundary |
| --- | --- |
| Domain | Pure inputs and `Result` outputs |
| Application orchestration | Hand-written repository fake |
| Infrastructure repository | MSW around the real HTTP client |
| Hook/component | Typed fake `AppContainer`; providers only as needed |

Rules:

- Expected fake failures resolve `Result.failure`; rejected promises test only
  the unexpected technical boundary.
- Reuse the closest current fake/helper and override only the operation under
  test. Create a shared fake only after a second real use.
- Use `waitFor` for observable async state and `act` around direct state-causing
  calls.
- Register every MSW request; `onUnhandledRequest: 'error'` stays enabled.
- Test wire shape and relevant error variants at the HTTP boundary.
- Add `jest-axe` and keyboard/focus assertions for new or materially changed
  routed pages/forms.

Run targeted tests while developing, then the complete frontend gates.
