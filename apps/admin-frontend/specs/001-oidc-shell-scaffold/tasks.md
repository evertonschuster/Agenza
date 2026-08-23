---

description: "Task list template for feature implementation"
---

# Tasks: OIDC-Authenticated Admin Shell Scaffold

**Input**: Design documents from `/specs/001-oidc-shell-scaffold/` (spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md)

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/env-contract.md, contracts/routes-contract.md, contracts/api-client-contract.md, quickstart.md — all read and current as of this generation.

**Tests**: Included. Spec FR-011/FR-012, User Story 4, constitution Principle V, and quickstart.md's validation scenarios all explicitly require unit, coverage, and real (non-mocked) end-to-end tests — this is an explicit request, not the default.

**Organization**: Tasks are grouped by user story (spec.md priorities P1/P1/P2/P3) to enable independent implementation and testing of each story, per FR-014's feature-based/vertical-slice layout.

**Revision note (2026-08-22)**: Renumbered after `/speckit-analyze` remediation. Two new tasks were added (T029, T032) and several existing tasks were expanded in scope (T022, T027, T040, T043, T036, T050) to close the G1–G4/U1/U2 findings from the Specification Analysis Report; I1/I2 were plan.md-only fixes and don't add tasks here beyond what T017's description now reflects. G2 was initially missed during restoration and added in a follow-up pass after a re-run `/speckit-analyze` caught it.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with its sibling tasks in the same list (different files, no dependency between them)
- **[Story]**: US1–US4, mapping to spec.md's four user stories
- All paths are relative to `apps/admin-frontend/` unless stated otherwise

## Path Conventions

Feature-based/vertical-slice layout per plan.md's Project Structure (spec FR-014): `src/app/` (shell), `src/features/auth/` (OIDC/session/tenant), `src/shared/` (API client, Shadcn/ui primitives, logger). No top-level `src/components/` or `src/pages/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and tooling — no auth/shell behavior yet.

- [x] T001 Create the Vite + React 19 + TypeScript project skeleton in `apps/admin-frontend/` (`package.json`, `index.html`, `public/`) with the npm scripts required by root `package.json` and `.github/workflows/frontend-ci.yml`: `dev`, `build`, `test`, `test:coverage`, `test:e2e`, `lint`, `format:check`, `generate:api-types`, `generate:api-types:check`
- [x] T002 [P] Configure `apps/admin-frontend/tsconfig.json` and `apps/admin-frontend/tsconfig.node.json` with `strict: true`, no implicit `any` (constitution Principle I)
- [x] T003 [P] Configure `apps/admin-frontend/vite.config.ts` (dev server on port 5173 per constitution Principle III)
- [x] T004 [P] Configure ESLint flat config in `apps/admin-frontend/eslint.config.js`
- [x] T005 [P] Configure Prettier in `apps/admin-frontend/.prettierrc.json` and `apps/admin-frontend/.prettierignore`
- [x] T006 [P] Configure Vitest in `apps/admin-frontend/vitest.config.ts`, including the coverage gate `include: ['src/**']` and the exclusions from research.md Decision 14 (`main.tsx`, `App.tsx`, `routes.tsx`, `shared/api/generated/**`)
- [x] T007 [P] Configure Playwright in `apps/admin-frontend/playwright.config.ts`
- [x] T008 [P] Initialize Tailwind CSS (`apps/admin-frontend/src/app/globals.css` with Tailwind directives; research.md Decision 4). **Implementation note**: used Tailwind v4's official `@tailwindcss/vite` plugin instead of the PostCSS + `tailwind.config.ts` route in the original tree — v4's Vite integration needs neither file; `plan.md`'s tree predates this and should be corrected to match.
- [x] T009 Initialize the Shadcn/ui CLI, creating `apps/admin-frontend/components.json` with `aliases` remapped to `src/shared/ui` and `src/shared/lib` — never the CLI's default `src/components/`/`src/lib/` (research.md Decision 4; depends on T008)
- [x] T010 [P] Create `apps/admin-frontend/.env.example` documenting the six `VITE_*` variables from contracts/env-contract.md

**Checkpoint**: `apps/admin-frontend` is a valid, lintable, buildable (empty) Vite project.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared plumbing every user story needs — auth client config, session state container, API client, logging. No redirect/render/renewal/logout *behavior* yet.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T011 [P] Create the minimal in-app logger in `apps/admin-frontend/src/shared/logger.ts` (spec FR-015, research.md Decision 9)
- [x] T012 [P] Create the Shadcn `cn()` class-merging helper in `apps/admin-frontend/src/shared/lib/utils.ts` (depends on T009)
- [x] T013 [P] Create the API type generation scripts `apps/admin-frontend/scripts/generateApiTypes.mjs` and `apps/admin-frontend/scripts/checkGeneratedApiTypes.mjs` per contracts/api-client-contract.md's Generation contract (source: `services-service`'s OpenAPI document, default `http://localhost:5080/openapi/v1.json`, overridable via `SERVICES_API_OPENAPI_URL`)
- [ ] T014 Run the T013 script against a running `services-service` to generate the initial `apps/admin-frontend/src/shared/api/generated/services-api.d.ts` (research.md Decision 6/7; depends on T013) — **deferred**: `services-service` isn't running yet; a clearly-marked placeholder stub is in place so downstream tasks aren't blocked. Will run for real once the Aspire stack is up for e2e verification (Phase 6).
- [x] T015 Create the typed API client factory `createApiClient(session: Session): Client<paths>` in `apps/admin-frontend/src/shared/api/apiClient.ts` using `openapi-fetch`, attaching `Authorization: Bearer <token>` and `X-Tenant-Id: <tenantId>` via its middleware/interceptor mechanism (contracts/api-client-contract.md; depends on T014)
- [x] T016 [P] Create an environment variable loader/validator for the six `VITE_*` vars that fails fast if any is missing (contracts/env-contract.md) in `apps/admin-frontend/src/shared/env.ts`
- [x] T017 Create `authClient.ts` (`oidc-client-ts` `UserManager` configured with `authority`, `client_id: "admin-panel"`, redirect/post-logout URIs, scope, `userStore: new WebStorageStateStore({ store: window.localStorage })` per plan.md's I1 remediation — **not** the library's `sessionStorage` default, so a second tab recognizes an existing session — and OIDC discovery per research.md Decision 13, with a documented fallback to explicit endpoints in comments) in `apps/admin-frontend/src/features/auth/authClient.ts` (depends on T016)
- [x] T018 [P] Create the `Session`, `Tenant Context`, and `Authenticated User` types from data-model.md in `apps/admin-frontend/src/features/auth/types.ts`
- [x] T019 Create `AuthProvider.tsx` (React Context wrapping the `UserManager`, session state machine per data-model.md's state transitions) and `useAuth.ts` in `apps/admin-frontend/src/features/auth/AuthProvider.tsx` and `apps/admin-frontend/src/features/auth/hooks/useAuth.ts` (depends on T017, T018)
- [x] T020 Create the route table skeleton and composition root — `apps/admin-frontend/src/app/routes.tsx` (per contracts/routes-contract.md: `/`, `/login`, `/callback`), `apps/admin-frontend/src/app/App.tsx`, `apps/admin-frontend/src/app/AppProviders.tsx` (composes `AuthProvider` + router) (depends on T019)
- [x] T021 Wire `apps/admin-frontend/src/main.tsx` and `apps/admin-frontend/src/vite-env.d.ts` to render `App.tsx` (depends on T020)

**Checkpoint**: App builds and boots. Auth plumbing, API client, logger, and routing skeleton all exist; no story-specific behavior yet.

---

## Phase 3: User Story 1 - Unauthenticated visitor is redirected to identity-service login (Priority: P1) 🎯 MVP

**Goal**: Any visitor without a valid session is sent to identity-service's OIDC login; no admin-frontend content ever renders first.

**Independent Test**: Open the app with no existing session (fresh/incognito) and confirm the browser ends up on identity-service's login screen.

### Tests for User Story 1 ⚠️

> Write these tests FIRST, ensure they FAIL before implementation

- [x] T022 [P] [US1] Unit test: `useAuth` reports `unauthenticated` status when no session exists; surfaces a failure state (`failureReason: 'identity_unreachable'`) instead of hanging or crashing when identity-service is unreachable during login (spec Edge Case — G1 remediation); **and (G2 remediation)** surfaces `failureReason: 'missing_tenant_claim'` and remains `unauthenticated` (fail closed) when a session exists with a valid, well-formed access token that lacks the `tenant_id` claim entirely (spec Edge Case, FR-009) — in `apps/admin-frontend/src/features/auth/hooks/useAuth.test.tsx` (renamed from `.ts` — contains JSX). Passing, incl. the T041 logout case in the same file.
- [x] T023 [P] [US1] Unit test: `ProtectedRoute` redirects to `/login` when session status is `unauthenticated` or `expired` (spec FR-001, FR-002, FR-009), in `apps/admin-frontend/src/features/auth/ProtectedRoute.test.tsx`. Passing.
- [ ] T024 [P] [US1] Playwright e2e test: an unauthenticated visitor opening the app lands on identity-service's OIDC login screen with no admin-frontend content visible first (quickstart.md Scenario 1), in `apps/admin-frontend/e2e/auth.spec.ts` — **pending**: requires the full Aspire stack running.

### Implementation for User Story 1

- [x] T025 [US1] Implement `ProtectedRoute.tsx` as the single fail-closed guard (spec FR-001, FR-002, FR-009; contracts/routes-contract.md) in `apps/admin-frontend/src/features/auth/ProtectedRoute.tsx`; wrap the `/` route in `routes.tsx` with it (depends on T019, T020; makes T023 pass)
- [x] T026 [US1] Implement the `/login` route trigger — a `SignInRedirect` component calling `authClient.signinRedirect()` — in `apps/admin-frontend/src/features/auth/components/SignInRedirect.tsx`; wire it into `routes.tsx` (depends on T020; makes T024 pass)
- [x] T027 [US1] Wire `AuthProvider` to check for an existing session on mount and resolve initial `unauthenticated`/`authenticated` status (spec FR-001, FR-009). **(G2 remediation)** If a session exists but its token lacks a `tenant_id` claim, treat it as invalid rather than authenticated: set `failureReason: 'missing_tenant_claim'` and remain `unauthenticated` (fail closed; spec Edge Case) — in `apps/admin-frontend/src/features/auth/AuthProvider.tsx` (depends on T019; makes the "no session" and "missing tenant claim" halves of T022 pass)
- [x] T028 [US1] Log `login_failure` auth events (spec FR-015) in `apps/admin-frontend/src/features/auth/authEvents.ts` (depends on T011, T027)
- [x] T029 [US1] **(G1 remediation)** Handle identity-service being unreachable during login: catch the network/discovery error from `authClient.signinRedirect()`, set the session's `failureReason` to `'identity_unreachable'` (data-model.md), and render a generic failure state in place of a silent hang or crash — no authenticated content is ever exposed (spec Edge Case) — in `apps/admin-frontend/src/features/auth/AuthProvider.tsx` and `apps/admin-frontend/src/features/auth/components/SignInRedirect.tsx` (depends on T026, T027; makes the `identity_unreachable` half of T022 pass; logs via T028's `authEvents.ts`)

**Checkpoint**: User Story 1 is independently functional and testable — opening the app with no session redirects to identity-service login, and identity-service being down surfaces a failure state rather than a silent hang.

---

## Phase 4: User Story 2 - Logged-in user sees the authenticated shell scoped to their tenant (Priority: P1)

**Goal**: After login at identity-service, the visitor returns to the shell (layout + placeholder navigation), tenant resolved only from the token.

**Independent Test**: Complete a real login and confirm the shell renders with the tenant matching the token's `tenant_id` claim.

### Tests for User Story 2 ⚠️

> Write these tests FIRST, ensure they FAIL before implementation

- [x] T030 [P] [US2] Unit test: `tenant.ts` resolves the tenant only from the token's `tenant_id` claim and ignores any URL/query/localStorage value even when present (spec FR-005, FR-006), in `apps/admin-frontend/src/features/auth/tenant.test.ts`. Passing.
- [x] T031 [P] [US2] Component test: `AppLayout` renders the shell layout + placeholder navigation with no business-domain content (spec FR-004, FR-013), in `apps/admin-frontend/src/app/AppLayout.test.tsx`. Passing.
- [x] T032 [P] [US2] **(U2 remediation)** Unit/component test for `LoginRedirect` completing the OIDC callback — mock `oidc-client-ts`'s `signinCallback()` to resolve successfully and assert navigation to `/`, and to reject and assert the failure path is taken instead (spec FR-003), in `apps/admin-frontend/src/features/auth/components/LoginRedirect.test.tsx`. Passing.
- [ ] T033 [P] [US2] Playwright e2e test: a real interactive login as the `DemoTenant` demo user (`owner@demo.local` / `Passw0rd!`) redirects through `/callback` to `/` and renders the shell with the matching tenant (quickstart.md Scenario 2; research.md Decision 12), in `apps/admin-frontend/e2e/auth.spec.ts` — **pending**: requires the full Aspire stack running.

### Implementation for User Story 2

- [x] T034 [US2] Implement `tenant.ts` (spec FR-005, FR-006; data-model.md Tenant Context — recomputed from the token on every change, never merged) in `apps/admin-frontend/src/features/auth/tenant.ts` (makes T030 pass)
- [x] T035 [US2] Implement the `/callback` route — a `LoginRedirect` component completing `oidc-client-ts`'s `signinCallback()` then navigating to `/` (contracts/routes-contract.md) — in `apps/admin-frontend/src/features/auth/components/LoginRedirect.tsx`; wire it into `routes.tsx` (depends on T020; makes T032 pass)
- [x] T036 [US2] Add the Shadcn/ui primitives needed for the shell (e.g. button, navigation) via the Shadcn CLI into `apps/admin-frontend/src/shared/ui/` (depends on T009). **(U1 remediation)** After running the CLI, confirm no top-level `src/components/` or `src/pages/` directory was created — this verifies the `components.json` alias remap from T009 actually took effect (spec FR-014). Verified: only `src/shared/ui/button.tsx` was created.
- [x] T037 [US2] Implement `AppLayout.tsx` (layout + placeholder navigation, built from `src/shared/ui` per FR-014) in `apps/admin-frontend/src/app/AppLayout.tsx`; render it for the `/` route inside `ProtectedRoute` (depends on T025, T036; makes T031 pass)
- [x] T038 [US2] Wire `AuthProvider`'s authenticated state to expose `Session`, `Tenant Context` (via `tenant.ts`), and `Authenticated User` for `AppLayout` to display (spec FR-004) in `apps/admin-frontend/src/features/auth/AuthProvider.tsx` (depends on T034, T035)
- [x] T039 [US2] Log `login_success` auth events (spec FR-015) in `apps/admin-frontend/src/features/auth/authEvents.ts` (depends on T038)

**Checkpoint**: User Stories 1 AND 2 both independently functional — the full login round-trip renders the tenant-scoped shell.

---

## Phase 5: User Story 3 - Active session renews silently; logout fully ends it (Priority: P2)

**Goal**: The session renews silently before expiry with no forced re-login; logout ends both the local and identity-service sessions.

**Independent Test**: Stay active past token expiry with no forced re-login; trigger logout and confirm the next navigation redirects to identity-service login.

### Tests for User Story 3 ⚠️

> Write these tests FIRST, ensure they FAIL before implementation

- [x] T040 [P] [US3] Unit tests: session renews silently before expiry and stays `authenticated` (spec FR-007); renewal failure transitions to `unauthenticated` with `failureReason: 'renewal_failed'` (data-model.md state transitions); **and (G3 remediation)** if the `tenant_id` claim's value changes during a successful renewal, `Tenant Context` updates to the new value rather than keeping the stale one (spec Edge Case) — in `apps/admin-frontend/src/features/auth/AuthProvider.test.tsx`. Passing.
- [x] T041 [P] [US3] Unit test: logout clears the local session and invokes identity-service's end-session flow (spec FR-008), in `apps/admin-frontend/src/features/auth/hooks/useAuth.test.tsx`. Passing (same file as T022).
- [ ] T042 [P] [US3] Playwright e2e test: a session that stays active past token expiry is not forced to re-login; triggering logout returns to `/login` and a subsequent visit to `/` redirects to login again (quickstart.md Scenario 3), in `apps/admin-frontend/e2e/auth.spec.ts` — **pending**: requires the full Aspire stack running.

### Implementation for User Story 3

- [x] T043 [US3] Configure `automaticSilentRenew` and renewal event handlers (`addUserLoaded`, `addSilentRenewError`) in `apps/admin-frontend/src/features/auth/authClient.ts` (depends on T017). **(G3 remediation)** On every `addUserLoaded` firing (including a successful renewal), re-derive `Tenant Context` from the new token's `tenant_id` claim rather than reusing the previous value (spec Edge Case) — makes the renewal-success and tenant-change halves of T040 pass
- [x] T044 [US3] Wire renewal-failure handling to the `unauthenticated`/`renewal_failed` transition (spec FR-009; data-model.md) in `apps/admin-frontend/src/features/auth/AuthProvider.tsx` (depends on T043, T027; makes the renewal-failure half of T040 pass)
- [x] T045 [US3] Implement logout — `authClient.signoutRedirect()`, ending both local and identity-service sessions (spec FR-008) — exposed via `useAuth.ts` and a nav action in `AppLayout.tsx` (depends on T037, T038; makes T041 pass)
- [x] T046 [US3] Log `renewal_failure` and `logout` auth events (spec FR-015) in `apps/admin-frontend/src/features/auth/authEvents.ts` (depends on T044, T045)

**Checkpoint**: User Stories 1, 2, and 3 all independently functional — the full auth lifecycle (login, silent renewal, logout) works, including tenant re-resolution on renewal.

---

## Phase 6: User Story 4 - Contributor can lint, format, type-check, and test the scaffold locally (Priority: P3)

**Goal**: Every constitutional CI quality gate passes locally on a clean checkout; the app runs through the orchestrator with no extra manual steps.

**Independent Test**: On a clean checkout, run each quality command independently and confirm each passes; start the app via the orchestrator and confirm it serves on the expected port.

These tasks verify the cumulative result of Phases 1–5 rather than adding new behavior — sequenced last because a "0 violations" pass is only meaningful once the full scaffold exists.

- [x] T047 [US4] Verify `npm run lint --workspace=apps/admin-frontend` passes cleanly (spec FR-011); fix any violations found in the code from Phases 1–5. 0 errors, 2 acceptable react-refresh warnings (Context/cva co-located with components — standard, non-blocking).
- [x] T048 [US4] Verify `npm run format:check --workspace=apps/admin-frontend` passes cleanly (spec FR-011); fix any violations found. Passing (specs/ and pre-existing tooling dirs excluded — not application source).
- [x] T049 [US4] Verify `npm run build --workspace=apps/admin-frontend` (tsc strict + Vite build) passes cleanly (spec FR-011; constitution Principle I); fix any violations found. Passing, no warnings.
- [x] T050 [US4] **(G4 remediation)** Verify both `npm run test --workspace=apps/admin-frontend` (the bare unit-test command) **and** `npm run test:coverage --workspace=apps/admin-frontend` pass cleanly against the Decision 14 coverage gate (spec FR-011, FR-012) — the bare `test` script is a distinct, real npm script that must be verified on its own, not assumed to pass just because `test:coverage` does; add tests for any uncovered branch. Both pass: 17/17 tests, 82.84% statement coverage (well above the trivial 1% gate).
- [ ] T051 [US4] Verify `npm run test:e2e --workspace=apps/admin-frontend` (all of T024, T033, T042) passes against the full Aspire-orchestrated stack (constitution Principle V) — **pending**: requires the full Aspire stack running.
- [ ] T052 [US4] Verify `npm run generate:api-types:check --workspace=apps/admin-frontend` passes with zero drift (constitution Principle IV/V; contracts/api-client-contract.md) — **pending**: requires `services-service` running; currently checked against a placeholder stub (T014).
- [ ] T053 [US4] Verify `dotnet run --project backend/AppHost` serves the admin-frontend on port 5173 with no manual steps beyond starting the orchestrator (spec FR-010, SC-001) — **pending**.

**Checkpoint**: All four user stories independently functional; every constitutional CI gate passes locally.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup that spans multiple stories.

- [ ] T054 [P] Correct the stale `src/features/catalog/infrastructure/generated/services-api.d.ts` path reference in the `api-contract-changes` job comment of `.github/workflows/frontend-ci.yml` to the actual generated path from T014 (research.md Decision 15)
- [ ] T055 Run the full quickstart.md validation guide end-to-end (all 6 scenarios) and confirm every "Expected" outcome holds
- [ ] T056 Re-review the Constitution Check table in plan.md against the finished implementation and confirm all six principles still PASS

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories.
- **User Stories (Phase 3–6)**: All depend on Foundational completion.
- **Polish (Phase 7)**: Depends on all four user stories being complete.

### User Story Dependencies

Each story has independently verifiable acceptance criteria (spec.md's Independent Test per story), but — unlike a typical multi-entity feature — these four stories all extend the *same small set of core files* (`AuthProvider.tsx`, `routes.tsx`, `AppLayout.tsx`, `authEvents.ts`), so implementing them out of priority order risks merge conflicts even though each story's behavior is independently testable once built:

- **User Story 1 (P1)**: Can start after Foundational. No dependency on other stories.
- **User Story 2 (P1)**: Can start after Foundational, but shares `AuthProvider.tsx` and `routes.tsx` with US1 — implement after US1 to avoid rework, even though its acceptance scenarios (spec.md) are independently verifiable.
- **User Story 3 (P2)**: Builds on US1's `AuthProvider`/`ProtectedRoute` and US2's `AppLayout` (for the logout nav action) — implement after both.
- **User Story 4 (P3)**: Verifies the cumulative result of US1–US3; implement last.

### Within Each User Story

- Tests written first, confirmed failing, then implementation makes them pass.
- Shared types/utilities before the components that consume them.
- Core state (`AuthProvider`) changes before the UI that reads it.
- Story complete (checkpoint) before moving to the next priority.

### Parallel Opportunities

- Setup: T002–T008, T010 (8 tasks) can run in parallel once T001 completes; T009 depends on T008.
- Foundational: T011, T012, T013, T016, T018 can run in parallel; T014→T015 and T016→T017→T019→T020→T021 are sequential chains.
- Within each story's Tests subsection, all [P]-marked tests target different files and can run in parallel.
- Different user stories should NOT be worked on by different people simultaneously in this feature, given the shared-file caveat above — unlike a typical independent-entity feature.

---

## Parallel Example: Setup Phase

```bash
# After T001 (project skeleton) completes, launch together:
Task: "Configure tsconfig.json and tsconfig.node.json with strict: true"
Task: "Configure vite.config.ts"
Task: "Configure ESLint flat config in eslint.config.js"
Task: "Configure Prettier in .prettierrc.json and .prettierignore"
Task: "Configure Vitest in vitest.config.ts with the Decision 14 coverage gate"
Task: "Configure Playwright in playwright.config.ts"
Task: "Initialize Tailwind CSS + PostCSS and create src/app/globals.css"
Task: "Create .env.example documenting the six VITE_* variables"
```

## Parallel Example: User Story 1 Tests

```bash
# Launch all three User Story 1 tests together (before implementation):
Task: "Unit test: useAuth reports unauthenticated with no session, and identity_unreachable when identity-service is down, in src/features/auth/hooks/useAuth.test.ts"
Task: "Unit test: ProtectedRoute redirects to /login when unauthenticated, in src/features/auth/ProtectedRoute.test.tsx"
Task: "Playwright e2e test: unauthenticated visitor lands on identity-service login, in e2e/auth.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Confirm an unauthenticated visitor is redirected to identity-service login, independent of any shell UI existing yet
5. Demo if ready — this alone proves the security-critical guarantee the rest of the feature depends on

### Incremental Delivery

1. Setup + Foundational → app builds and boots, no behavior yet
2. Add User Story 1 → unauthenticated redirect works (MVP)
3. Add User Story 2 → full login round-trip renders the tenant-scoped shell
4. Add User Story 3 → silent renewal + logout complete the auth lifecycle
5. Add User Story 4 → every constitutional CI gate verified green
6. Polish → fix the stale CI comment, run the full quickstart, re-confirm the Constitution Check

### Solo Developer Strategy

Given the shared-file dependency noted above, implement in strict priority order (US1 → US2 → US3 → US4) rather than attempting parallel story work — each checkpoint is still a valid, independently demoable increment even though the files build on each other sequentially.

---

## Notes

- [P] tasks = different files, no dependency on an incomplete sibling task
- [Story] label maps each task to its user story for traceability back to spec.md
- Tests are included per spec FR-011/FR-012, User Story 4, and constitution Principle V — write them first and confirm they fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently via its spec.md "Independent Test"
- The Playwright e2e tests (T024, T033, T042) all extend the same `e2e/auth.spec.ts` file — implement them in task order (T024 before T033 before T042) even though each is tagged [P] relative to its own story's other tests
