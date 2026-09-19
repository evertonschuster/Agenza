# Phase 0 Research: Diálogo de Confirmação Reutilizável

No `[NEEDS CLARIFICATION]` left — scope was already resolved in the spec (4 rounds under
`## Clarifications`). What's left here is **how**, deliberately kept out of the spec (Quick
Guidelines: WHAT/WHY, not HOW).

## Decision 1 — The component is presentational; it does not call `useFetcher` itself

**Decision**: `ConfirmDialog` (`shared/ui/confirm-dialog.tsx`) receives already-derived state via
props — `isSubmitting: boolean` and an optional, already-classified failure
(`{ message: string; transient: boolean } | undefined`) — and exposes `onConfirm: () => void` as a
plain trigger (not `Promise`-returning). It has no idea what "confirm" means or how submission
happens.

**Rationale**: React Router's `useFetcher<typeof tagsAction>()` is typed per route
(`typeof tagsAction`). A shared component can't call `useFetcher` generically without losing that
typing — it would need `any` or a generic `ActionFunction`, which constitution Principle I /
`AGENTS.md` don't allow without justification. On top of that, `fetcher.submit()` resolves before the
action's result exists; the result arrives via `fetcher.state`/`fetcher.data` on later renders, not
through await — so even a `onConfirm: () => Promise<ApiResult<void>>` contract wouldn't fit without a
fetcher-to-Promise bridge that doesn't exist anywhere in the codebase today.

**Alternatives considered**:
- *Component owns the state machine, `onConfirm` returns `Promise<ApiResult<void>>`* — would require
  inventing a fetcher-to-Promise bridge on this feature's first real use, for a single real consumer
  (spec FR-007 already decided there's no second one yet). Conflicts with
  [[prefers-minimal-plumbing]] — building an abstraction before two real uses exist to justify it.
- *Render props / compound component* (`<ConfirmDialog.Trigger>`, `<ConfirmDialog.Blocked>`, …) —
  solves the same problem with a larger API surface; no other `shared/ui/` primitive in this repo uses
  that pattern (all are plain props), so it would be a new convention without proven need.

## Decision 2 — Transient/blocking classification becomes a pure function in `servicesFacade.ts`

**Decision**: Extract the logic that lives today inline in `DeleteTagDialog.tsx`
(`TRANSIENT_ERROR_CODES`/`isTransientFailure`) into a pure function — something like
`isTransientProblem(problem: ApiProblem): boolean` — declared in
`src/shared/api/servicesFacade.ts`, next to `NETWORK_PROBLEM`, `SESSION_PROBLEM`, and
`SERVER_PROBLEM` (the only three codes it reads).

**Rationale**: The logic is already generic today — it never references `Tag`, only the three shared
sentinels. Moving it to where those sentinels already live is the smallest diff that makes it
importable by any future routine (spec FR-004), without a new file for ~5 lines.

**Alternatives considered**:
- *New file `shared/api/classifyFailure.ts`* — would separate the function from where the three
  sentinels it reads are declared and maintained; ceremony without benefit for a function this size.
  [[prefers-minimal-plumbing]].
- *Keep the classification inside `confirm-dialog.tsx`* — would invert Decision 1 (the component would
  receive the raw `ApiProblem` and decide for itself), re-coupling the UI primitive to a network-error
  shape. Rejected for the same reason as Decision 1: the component should receive already-decided
  state, not decide it.

## Decision 3 — Confirm-button icon: `LucideIcon`, not a new type

**Decision**: `confirmIcon: LucideIcon` (the type `lucide-react` already exports).

**Rationale**: Already the repo's convention for "icon configurable by whoever consumes the
component" — `app/shell/navigation.ts`, `app/shell/CommandPalette.tsx`, and `app/pages/ComingSoon.tsx`
all type it this way. Reuse it instead of inventing a bespoke `ComponentType<...>`.

**Alternatives considered**: None — a single, already-established convention, nothing to resolve.

## Decision 4 — `confirm-dialog.tsx` stays out of `coverage.exclude`

**Decision**: No new entry in `vitest.config.ts` → `coverage.exclude`. The file is covered like any
code with real logic, under the standard thresholds (85% lines/functions/statements, 80% branches).

**Rationale**: The exclusion list today covers two cases, neither of which applies here —
(a) purely presentational primitives with no logic (`avatar`, `button`, `card`, …), and (b) primitives
with real logic that ship unconsumed shadcn scaffold subcomponents (`dropdown-menu`, `combobox`,
`sheet`, `toast` — see ARCHITECTURE.md D5). `confirm-dialog.tsx` has real logic (three states,
integration with the Decision 2 classification) **and** a real consumer from day one
(`DeleteTagDialog`) exercising all of it — the direct precedent is `color-swatch-picker.tsx` (also
born from Etiquetas, also outside the list). Confirms spec NFR-003.

**Alternatives considered**: Adding it to the list "by analogy" with `dialog.tsx`/`sheet.tsx` —
rejected during spec clarification precisely because that analogy doesn't hold: those files have
scaffold parts with no consumer; this component has none unused.

## Decision 5 — Success feedback stays owned by the consumer, not the component

**Decision**: `ConfirmDialog` never fires a toast. Whoever consumes it (e.g., the adapter in
`DeleteTagDialog.tsx`) keeps its own `useEffect` watching the submission result and calls
`toast.add(...)` with whatever copy it wants — exactly like today.

**Rationale**: `TagFormDialog.tsx` (Etiquetas' other dialog, out of scope for this feature) already
uses this exact pattern — its own `useEffect` watching `fetcher.state`/`fetcher.data`, calling
`toast.add(...)` inline. It's an existing, consistent convention, not a `DeleteTagDialog`-only quirk.
Making the shared component own the toast would require it to know about `fetcher`/submission —
contradicting Decision 1.

**Alternatives considered**: `ConfirmDialog` accepts an `onSuccess` callback and fires the toast
internally — rejected for solving nothing the current pattern (submission owner handles its own toast)
doesn't already solve, while adding a responsibility to the component it doesn't need.

## Decision 6 — Blocked-state title/message are required per-routine config, not a factory default

**Decision**: `title`, `description`, `confirmLabel`, `confirmIcon`, and `blockedTitle` are required
per-routine configuration (spec FR-002 lists a minimum, not a ceiling — this is the full set). Only
the auxiliary labels unrelated to the specific action — `cancelLabel` ("Cancelar"), `retryLabel`
("Tentar novamente"), `dismissLabel` ("Entendi") — get an overridable pt-BR default (spec FR-010).

**Rationale**: "Não é possível excluir" (today's blocked-state title) is specific to the verb
"excluir" — a generic factory default would be wrong for "desativar"/"remover" (spec FR-008 already
covers both). Since FR-006 requires preserving Etiquetas' exact copy, `DeleteTagDialog` still needs to
pass "Não é possível excluir" explicitly — which only works if the field is required configuration,
not a default it would need to override anyway.

**Alternatives considered**: A generic `blockedTitle` default like "Não foi possível concluir esta
ação" — rejected because it would create a factory value the one real routine (Etiquetas) has to
override regardless, with no other real consumer today to benefit from it (FR-007: none exists yet).
