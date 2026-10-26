# Tasks: CPF conflict navigation

- [x] T001 Specify the confirmed navigation behavior and record research/contracts.
- [x] T002 [US1] Preserve error code and metadata in `formErrors.ts` and `applyApiProblem.ts`.
- [x] T003 [US1] Render the safe new-tab link in `ClientPersonSection.tsx`.
- [x] T004 [US1] Test create/edit, stale conflicts and missing/unrelated metadata in `ClientFormPage.test.tsx`.
- [x] T005 [US1] Extend `e2e/clients.spec.ts` to open and verify both tabs.
- [x] T006 Document ADR 0084 and update the architecture history.
- [x] T007 Run quality gates and leave a separate local commit.

T001 precedes implementation; T002 precedes T003; T004–T005 verify behavior; T006–T007 finish it. The tests and documentation have no dependency on each other once navigation is fixed. One agent executes the work. Owner review replaced the original page state with a CPF field-error subscription (ADR 0085).
