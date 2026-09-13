---
description: "Task list for Service Tags CRUD"
---

# Tasks: Service Tags CRUD

**Input**: Design documents from `specs/003-tags-crud/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/routes-contract.md](./contracts/routes-contract.md)

**Tests**: Included. Not explicitly demanded by spec.md, but constitution Principle V makes Vitest
coverage and a real (non-mocked) Playwright pass non-negotiable from scaffold — skipping test tasks
here would leave the feature unable to pass CI.

**Organization**: Grouped by user story (spec.md priorities) so each is independently
implementable, testable, and demoable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: different files, no ordering dependency on an incomplete task
- **[Story]**: US1–US4, per spec.md. Setup/Foundational/Polish carry no story label.
- All paths are relative to `apps/admin-frontend/` unless stated otherwise.

---

## Phase 1: Setup

- [ ] T001 Create the `src/features/tags/` skeleton — empty `model/`, `api/`,
  `ui/pages/TagsPage/` folders and an `index.ts` barrel stub
- [ ] T002 [P] Run `npm run generate:api-types:check` — confirm the generated client already
  covers `/tags` with no diff (research.md Decision 1)

---

## Phase 2: Foundational (blocks every user story)

**⚠️ CRITICAL**: `/tags` is not reachable and nothing below compiles until this phase is done.

- [ ] T003 [P] Define the `Tag` domain type and the 8-entry color palette constant in
  `src/features/tags/model/tag.ts` (data-model.md)
- [ ] T004 [P] Define client-side field validation (`validateTagForm`: name required ≤40,
  description ≤200) in `src/features/tags/model/tagForm.ts` (research.md Decision 5 — UX
  pre-check only, never the source of truth)
- [ ] T005 [P] Build the color-swatch picker primitive in `src/shared/ui/color-swatch-picker.tsx`
  via the `agenza-ui-primitive` skill — generic `{value,label}[]` options, `role="radiogroup"`,
  no Tag-specific knowledge (research.md Decision 4)
- [ ] T006 Implement `tagsRepository` (`list`, `create`, `update`, `remove`) in
  `src/features/tags/api/tagsRepository.ts`, delegating to `servicesApi` verbatim (depends on
  T003)
- [ ] T007 Implement `tagsLoader` + `tagsAction` in
  `src/features/tags/ui/pages/TagsPage/route.ts` per contracts/routes-contract.md — loader
  `unwrapOrThrow`s, action returns the raw `ApiResult` (depends on T006)
- [ ] T008 Export `TagsPage`, `tagsLoader`, `tagsAction` from `src/features/tags/index.ts`
  (depends on T007)
- [ ] T009 Wire the `/tags` route into `src/app/routes.tsx` (`lazy` returning
  `Component`/`loader`/`action` together, contracts/routes-contract.md) (depends on T008)
- [ ] T010 [P] Add the "Etiquetas" entry to `src/app/shell/CommandPalette.tsx`, kept out of
  `NAV_DESTINATIONS` (research.md Decision 7; spec FR-014) (depends on T008)

**Checkpoint**: `/tags` renders (empty body). User story work can begin.

---

## Phase 3: User Story 1 — List & search (Priority: P1) 🎯 MVP

**Goal**: the person sees every existing tag and narrows the list by typing part of a name (spec
US1).

**Independent Test**: seed tags directly via API, open `/tags`, confirm each renders (chip, color,
description); type a name substring, confirm the list narrows; clear it, confirm the full list
returns; with zero tags, confirm the empty state (not an error).

### Tests for User Story 1

- [ ] T011 [P] [US1] Component test — list rendering, empty-catalog state, empty-search state in
  `src/features/tags/ui/pages/TagsPage/TagsPage.test.tsx`
- [ ] T012 [P] [US1] Hook test — search filter is a case-insensitive substring match over the
  already-loaded list in `src/features/tags/ui/pages/TagsPage/useTagsPage.test.ts`

### Implementation for User Story 1

- [ ] T013 [P] [US1] Implement `TagRow.tsx` (chip via the existing global `.tag` class,
  description, row-actions slot) in `src/features/tags/ui/pages/TagsPage/TagRow.tsx`
- [ ] T014 [US1] Implement `useTagsPage.ts` (read loader data, search state, filtered list,
  empty/empty-search branching) in `src/features/tags/ui/pages/TagsPage/useTagsPage.ts` (depends
  on T013)
- [ ] T015 [US1] Implement `TagsPage.tsx` shell — search input + list of `TagRow` + page header
  with only the title and the primary action (no route indicator, no subtitle — spec FR-015) in
  `src/features/tags/ui/pages/TagsPage/TagsPage.tsx` (depends on T014)

**Checkpoint**: US1 fully functional and independently testable — `/tags` lists and searches real
data.

---

## Phase 4: User Story 2 — Create a tag (Priority: P1)

**Goal**: the person creates a tag (name, color, optional description) that appears in the list
immediately (spec US2).

**Independent Test**: fill a valid name + color, submit, see it in the list without a reload;
submit with a missing field or a name already in use, see the exact backend message inline, and
confirm nothing was created.

### Tests for User Story 2

- [ ] T016 [P] [US2] Component test — required-field errors, duplicate-name banner (verbatim
  backend text, spec FR-012), successful create in
  `src/features/tags/ui/pages/TagsPage/TagFormDialog.test.tsx`

### Implementation for User Story 2

- [ ] T017 [US2] Implement `TagFormDialog.tsx` create mode — name input, `color-swatch-picker`,
  description textarea, backend error rendering by structure (field vs. general) never by parsing
  message text, in `src/features/tags/ui/pages/TagsPage/TagFormDialog.tsx` (depends on T005, T004)
- [ ] T018 [US2] Wire "Nova etiqueta" (button + `n` shortcut, mirroring `Services.tsx`'s
  `useShortcut` pattern) in `TagsPage.tsx` to open `TagFormDialog` and submit `intent=create` via
  `useFetcher` (depends on T015, T017)

**Checkpoint**: US1 + US2 — a real catalog can be built through the UI. This is the feature's MVP
(spec.md assigns both P1; US2 alone has nothing to list, US1 alone has nothing to show).

---

## Phase 5: User Story 3 — Edit a tag (Priority: P2)

**Goal**: the person corrects an existing tag's name, color, or description without recreating it
(spec US3).

**Independent Test**: open an existing tag, change name + color, save, confirm the list updates;
rename it to another tag's existing name, confirm the conflict message and that nothing saved.

### Tests for User Story 3

- [ ] T019 [P] [US3] Component test — pre-filled fields, rename-to-duplicate conflict, in the same
  `src/features/tags/ui/pages/TagsPage/TagFormDialog.test.tsx` from T016

### Implementation for User Story 3

- [ ] T020 [US3] Extend `TagFormDialog.tsx` with edit mode — pre-fill from the selected `Tag`,
  submit `intent=update` (depends on T017)
- [ ] T021 [US3] Wire each row's "Editar" action (`TagRow.tsx` / `useTagsPage.ts`) to open
  `TagFormDialog` in edit mode (depends on T013, T020)

**Checkpoint**: US1 + US2 + US3 — the catalog can be fully maintained except deletion.

---

## Phase 6: User Story 4 — Delete a tag (Priority: P2)

**Goal**: the person removes an unused tag; a tag still in use is protected, with a clear reason
(spec US4).

**Independent Test**: delete a tag with no service using it, confirm it disappears; attempt to
delete one that's in use, confirm the dialog shows the exact service count from the backend and
that it is not removed.

### Tests for User Story 4

- [ ] T022 [P] [US4] Component test — confirm→success and confirm→blocked-in-use (verbatim service
  count, spec FR-008) in `src/features/tags/ui/pages/TagsPage/DeleteTagDialog.test.tsx`

### Implementation for User Story 4

- [ ] T023 [US4] Implement `DeleteTagDialog.tsx` — confirm state, then the blocked-state swap,
  submitting `intent=delete` via `useFetcher` (depends on T007)
- [ ] T024 [US4] Wire each row's "Excluir" action (`TagRow.tsx` / `useTagsPage.ts`) to open
  `DeleteTagDialog` (depends on T013, T023)

**Checkpoint**: All four user stories independently functional — full CRUD.

---

## Phase 7: Polish & Cross-Cutting

- [ ] T025 [P] Add a fixture-seeding helper (tag + a service referencing it, via direct
  authenticated API calls) in `e2e/helpers.ts` (research.md Decision 8 — no Services-creation UI
  exists to drive this through the browser)
- [ ] T026 Write `e2e/tags.spec.ts` — full CRUD path plus the duplicate-name and tag-in-use
  conflicts, per quickstart.md (depends on T025 and on Phases 3–6)
- [ ] T027 [P] Record this feature's `loader`/`action`-per-route pattern — the app's first real use
  of it — in `docs/ARCHITECTURE.md`
- [ ] T028 Run the full gate suite (`npm run lint`, `npm run format:check`, `npx tsc --noEmit`,
  `npm run generate:api-types:check`, `npm run test:coverage`, `npm run test:e2e`) and fix until
  green (depends on everything above)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: depends on Setup — blocks every user story.
- **User Stories (Phase 3–6)**: all depend on Foundational. US1/US2 have no dependency on each
  other's *code* but are each other's MVP pair (see below); US3/US4 build on US1's `TagRow` and
  US2's `TagFormDialog` files, not on their features being finished.
- **Polish (Phase 7)**: depends on all four user stories (e2e needs the full flow).

### Within Each Story

- Tests are listed before implementation (write them first; they should fail until the
  implementation task lands).
- `model` → `api` → `route.ts` → page/dialog components, matching Phase 2's own order.

### Parallel Opportunities

- T003/T004/T005 (Phase 2) — different files, no shared dependency.
- T010 can run alongside T009 (different files).
- T011/T012 (US1 tests), T013 (US1 impl) can start together.
- Once Phase 2 is done, US1 and US2 can be staffed in parallel; US3/US4 should follow since they
  extend US1's/US2's own files (`TagRow.tsx`, `TagFormDialog.tsx`).

---

## Parallel Example: Phase 2

```bash
Task: "Define Tag domain type + color palette in src/features/tags/model/tag.ts"
Task: "Define validateTagForm in src/features/tags/model/tagForm.ts"
Task: "Build color-swatch-picker in src/shared/ui/color-swatch-picker.tsx"
```

---

## Implementation Strategy

### MVP = US1 + US2 (both P1)

Spec.md scores both P1 for a reason: US1 alone has nothing to show, US2 alone has nowhere to show
what was created. Ship Setup → Foundational → US1 → US2 as the first demoable increment; US3
(edit) and US4 (delete) are real but non-blocking improvements on top.

### Incremental Delivery

1. Setup + Foundational → `/tags` reachable, empty.
2. US1 → real list + search (demoable against seeded data).
3. US2 → the catalog can grow (MVP complete).
4. US3 → mistakes are fixable.
5. US4 → the catalog can be kept clean; the in-use guard is provably enforced.
6. Polish → e2e proof of the whole flow, gate suite green, architecture doc updated.
