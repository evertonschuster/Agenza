---

description: "Task list for Diálogo de Confirmação Reutilizável"
---

# Tasks: Diálogo de Confirmação Reutilizável

**Input**: Design documents from `/specs/004-shared-confirm-dialog/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories),
[research.md](./research.md), [contracts/confirm-dialog-contract.md](./contracts/confirm-dialog-contract.md)

**Tests**: Included. Not optional here — spec NFR-003 requires real coverage for the new component,
and constitution Principle V requires the Vitest coverage gate to pass for every change.

**Organization**: Tasks are grouped by user story (spec.md) to enable independent implementation and
testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Which user story this task belongs to (US1, US2)
- File paths are relative to `apps/admin-frontend/`

## Path Conventions

Single frontend project — all paths under `src/`, per [plan.md](./plan.md)'s Project Structure.

---

## Phase 1: Setup

**Purpose**: Capture the pre-change baseline this refactor must not regress.

- [X] T001 Run `npm run test -- DeleteTagDialog` and `npm run test:coverage`. Confirm the 5 existing
      `DeleteTagDialog.test.tsx` cases pass today, and note the current coverage numbers — this is the
      "before" snapshot spec FR-006 (no visible regression) is checked against (quickstart.md).

**Checkpoint**: Baseline captured. No code changed yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared primitive and the classification helper both User Story 1 and User Story 2
depend on. Neither story is meaningfully startable before this phase is done.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 [P] Add `isTransientProblem(problem: ApiProblem): boolean` to
      `src/shared/api/servicesFacade.ts`, next to `NETWORK_PROBLEM`/`SESSION_PROBLEM`/`SERVER_PROBLEM`
      — `true` for those three codes, `false` for anything else including a missing code
      (research.md Decision 2; contracts/confirm-dialog-contract.md).
- [X] T003 Add cases for `isTransientProblem` to `src/shared/api/servicesFacade.test.ts` — one per
      sentinel code (transient) plus one arbitrary/undefined code (not transient). Depends on T002.
- [X] T004 [P] Implement `ConfirmDialog` in `src/shared/ui/confirm-dialog.tsx`, built on the existing
      `shared/ui/dialog.tsx` + `shared/ui/button.tsx` primitives, per
      contracts/confirm-dialog-contract.md's Props and States tables (confirming /
      confirming+transient-with-retry / blocked). Enforce the contract rules: MUST NOT import from
      `features/*`, call `useFetcher`, reference `ApiProblem`/`ApiResult`, or call `toast.add`.

**Checkpoint**: `ConfirmDialog` and `isTransientProblem` exist and compile. User story work can start —
US1 and US2 can proceed in parallel from here.

---

## Phase 3: User Story 1 — Etiquetas' delete flow, unchanged, on the shared component (Priority: P1) 🎯 MVP

**Goal**: `DeleteTagDialog.tsx` becomes a thin adapter over `ConfirmDialog`; every observable behavior
(copy, button order, states) stays exactly what it is today.

**Independent Test**: Confirm an unused tag, cancel before confirming, attempt an in-use tag, and hit a
transient failure — all four match today's behavior exactly (spec US1 Acceptance Scenarios).

### Implementation for User Story 1

- [X] T005 [US1] Rewrite `src/features/tags/ui/pages/TagsPage/DeleteTagDialog.tsx` as a thin adapter:
      keep its own `useFetcher<typeof tagsAction>()` and the existing success-toast `useEffect`; derive
      `isSubmitting` and a `failure` object via `isTransientProblem` (T002); render `<ConfirmDialog>`
      with Etiquetas' config — `title="Excluir etiqueta?"`, `confirmLabel="Excluir"`,
      `confirmIcon={Trash2Icon}`, `blockedTitle="Não é possível excluir"` — per
      contracts/confirm-dialog-contract.md's Consumer contract. Depends on T002, T004.

### Verification for User Story 1

- [X] T006 [US1] Run `npm run test -- DeleteTagDialog` with **zero edits** to
      `DeleteTagDialog.test.tsx`. All 5 existing cases (confirm-gated submit, success + toast,
      blocked-in-use with exact count, not-found edge case, transient failure + retry) must still
      pass unmodified — the test file needing a change is itself a signal that T005 introduced a
      visible regression (spec FR-006), not a reason to update the assertions. Depends on T005.

**Checkpoint**: Etiquetas' delete flow is fully functional on top of `ConfirmDialog`, provably
unchanged.

---

## Phase 4: User Story 2 — A new routine can configure the dialog without rebuilding it (Priority: P1)

**Goal**: Prove `ConfirmDialog` is genuinely reusable by configuration alone, without building a second
real screen (spec FR-007 — out of scope for this feature).

**Independent Test**: Render `ConfirmDialog` with copy and a confirm action distinct from Etiquetas';
confirm it shows only the configured text and that two differently-configured instances don't leak
each other's copy (spec US2 Acceptance Scenarios).

### Implementation for User Story 2

- [X] T007 [P] [US2] Write `src/shared/ui/confirm-dialog.test.tsx` — exercise all three states
      (confirming, confirming+transient-with-retry, blocked) purely via props, using a
      title/description/confirmLabel/blockedTitle distinct from Etiquetas' copy. Assert: (a) only the
      configured text renders, nothing tags-specific; (b) a second render with different config shows
      its own copy, not the first's (spec US2 AC1–AC2). This is `ConfirmDialog`'s primary NFR-003
      coverage contributor. Depends on T004 only — can run in parallel with Phase 3.

**Checkpoint**: `ConfirmDialog` is proven reusable independently of Etiquetas. Both P1 stories done.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Gate checks and documentation — nothing here changes behavior.

- [X] T008 [P] Run `npm run lint`, `npm run format:check`, and `npx tsc --noEmit` — clean
      (constitution Principles I and V).
- [X] T009 Run `npm run test:coverage` — confirm `src/shared/ui/confirm-dialog.tsx` appears in the
      report with a real percentage (not silently 0% via `coverage.exclude`) and the aggregate
      thresholds (85% lines/functions/statements, 80% branches) still pass (spec NFR-003).
- [X] T010 Run `npm run test:e2e -- tags.spec.ts` — the existing "deletes an unused tag" and "blocks
      deleting a tag in use" Playwright cases pass unmodified against the real Aspire stack (spec
      FR-006; constitution Principle V, no mocks).
- [X] T011 [P] Add one row to `docs/ARCHITECTURE.md`'s decision log (§5, same table `features/tags` /
      `color-swatch-picker` already use) recording `confirm-dialog.tsx` + the `isTransientProblem`
      extraction — [[admin-frontend-architecture-doc]] asks for the living doc to stay in sync.

**Checkpoint**: All CI gates green; documentation current. Ready to open a PR.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup. Blocks both user stories.
- **User Stories (Phase 3, Phase 4)**: Both depend only on Foundational — **not on each other**. Can
  run sequentially (as numbered) or in parallel (e.g., two people, one per story).
- **Polish (Phase 5)**: Depends on both user stories being done.

### Within Each Phase

- T002 before T003 (can't test a function that doesn't exist yet).
- T002 and T004 are independent (different files) — parallelizable.
- T005 depends on both T002 and T004. T006 depends on T005.
- T007 depends only on T004 — does not wait for Phase 3.

### Parallel Opportunities

- T002 and T004 together (Phase 2).
- Phase 3 (T005→T006) and Phase 4 (T007) together, once Phase 2 is done.
- T008 and T011 together (Phase 5); T009 and T010 need T008's clean `tsc`/lint state first in
  practice, even though nothing technically forbids running them earlier.

---

## Parallel Example: Phase 2

```bash
# Once Phase 1 is done, launch both foundational tasks together:
Task: "Add isTransientProblem to src/shared/api/servicesFacade.ts"
Task: "Implement ConfirmDialog in src/shared/ui/confirm-dialog.tsx"
```

## Parallel Example: Phase 3 + Phase 4

```bash
# Once Phase 2 is done, US1 and US2 need nothing from each other:
Task: "Rewrite DeleteTagDialog.tsx as a thin adapter over ConfirmDialog, then verify its existing test"
Task: "Write confirm-dialog.test.tsx proving reuse via a differently-configured instance"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 → Phase 2 → Phase 3. **Stop and validate**: `DeleteTagDialog.test.tsx` passes unmodified,
   `e2e/tags.spec.ts` passes. Etiquetas' delete flow is safely on the new component — ship this alone
   if needed; `ConfirmDialog` already exists and is not going anywhere.
2. Phase 4 adds the reusability proof (US2) whenever convenient — it doesn't touch Etiquetas at all.
3. Phase 5 closes out gates + docs.

### Incremental Delivery

Phase 1+2 → Phase 3 (MVP: Etiquetas migrated, zero regression) → Phase 4 (reusability proven) →
Phase 5 (gates + docs). Each checkpoint leaves the tree in a shippable state.

---

## Notes

- No `[P]` on T003, T005, T006, T009, T010 — each depends on a task listed immediately before it.
- This feature touches exactly 3 source files (`confirm-dialog.tsx`, `servicesFacade.ts`,
  `DeleteTagDialog.tsx`) plus their tests — no route, no new dependency, no data entity (plan.md
  Summary). The small task count reflects that, not incompleteness.
- Per spec Out of Scope: no second real routine is built here (FR-007) — T007 proves reuse through
  configuration, not through a second screen.
