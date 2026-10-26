# Tasks: identity guard

## US1 — safe renewal

- [x] T001 Record specification, research, state model and plan in this directory.
- [x] T002 [US1] Guard subject/tenant and latch identity changes in `src/shared/session/`.
- [x] T003 [US1] Cancel the outgoing request scope in `src/shared/api/apiClient.ts`.
- [x] T004 [US1] Remove the OIDC user and reject late events in `src/features/auth/model/sessionDriver.ts`.
- [x] T005 [US1] Replace protected content with explicit re-login feedback in `src/features/auth/ui/ProtectedRoute.tsx`.
- [x] T006 [US1] Prove the state transitions, event races, pending requests and unmounting with colocated tests.
- [x] T007 Document ADR 0083 and update architecture and tenant review references.
- [x] T008 Run quality gates and leave one local commit.

## Dependencies and execution

T001 precedes implementation; T002 precedes T003–T005; T006 verifies them; T007 and T008 finish the change. Tests and documentation can be prepared independently after the state contract is fixed; this implementation uses one agent and sequential commits.
