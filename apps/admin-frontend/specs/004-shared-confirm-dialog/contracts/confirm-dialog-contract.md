# Contract: `ConfirmDialog` (`shared/ui/confirm-dialog.tsx`)

A presentational primitive. It owns rendering the three states spec FR-003 requires; it owns nothing
about *how* the confirmed action is submitted, classified, or reported as a success (research.md
Decisions 1, 2, 5). This is a UI contract (props in, events out), not an API contract — the feature
adds no backend surface.

## Props

| Prop | Type | Required | Notes |
|---|---|---|---|
| `open` | `boolean` | yes | Forwarded to `Dialog`'s `open`. |
| `onOpenChange` | `(open: boolean) => void` | yes | Forwarded to `Dialog`'s `onOpenChange`; also what the dismiss button in the blocked state calls (with `false`). |
| `onConfirm` | `() => void` | yes | Fired by the confirm/retry button. Plain trigger, not `Promise`-returning (research.md Decision 1) — the caller decides what happens next via `isSubmitting`/`failure` on the next render. |
| `isSubmitting` | `boolean` | yes | Disables the confirm/retry button while `true` (spec FR-005). Does **not** disable Cancel — matches today's `DeleteTagDialog` behavior (spec FR-006). |
| `title` | `string` | yes | Confirming-state heading (e.g. "Excluir etiqueta?"). |
| `description` | `ReactNode` | yes | Confirming-state body. Callers interpolate their own entity name into this (e.g. the tag name) — the component does no string templating. |
| `confirmLabel` | `string` | yes | Confirm button label while no transient failure is active. |
| `confirmIcon` | `LucideIcon` (from `lucide-react`) | yes | Rendered inside the confirm/retry button (research.md Decision 3). |
| `blockedTitle` | `string` | yes | Heading shown in the blocked state (e.g. "Não é possível excluir"). Required, not defaulted — see research.md Decision 6. |
| `failure` | `{ message: string; transient: boolean } \| undefined` | no (default `undefined`) | `undefined` → confirming state. `transient: true` → confirming state + inline banner + button relabeled to `retryLabel`. `transient: false` → blocked state. Already-classified by the caller via `isTransientProblem` (see below) — the component does not inspect `ApiProblem` itself. |
| `cancelLabel` | `string` | no (default `"Cancelar"`) | Confirming-state secondary button. |
| `retryLabel` | `string` | no (default `"Tentar novamente"`) | Replaces `confirmLabel` on the confirm button while `failure?.transient === true`. |
| `dismissLabel` | `string` | no (default `"Entendi"`) | Blocked-state's single button label. |

## States

| State | Trigger | Renders |
|---|---|---|
| Confirming | `failure` is `undefined` | `title` + `description`; footer: Cancel (`cancelLabel`) + Confirm (`confirmIcon` + `confirmLabel`, disabled while `isSubmitting`). |
| Confirming + transient failure | `failure?.transient === true` | Same layout, plus an inline alert banner with `failure.message`; confirm button label becomes `retryLabel`, still calls `onConfirm`. Dialog stays open; `onOpenChange(false)` is not called automatically. |
| Blocked | `failure?.transient === false` | Replaces the confirming layout entirely: `blockedTitle` + `failure.message`; footer: single `dismissLabel` button calling `onOpenChange(false)`. No way to retry the same action from here (spec FR-003). |

Closing the dialog (Esc, outside click, close button) while `isSubmitting` is `true` is allowed in any
state — the in-flight request is not cancelled by it (spec Edge Cases).

## Companion contract: `isTransientProblem` (`shared/api/servicesFacade.ts`)

```ts
function isTransientProblem(problem: ApiProblem): boolean;
```

- **Input**: an `ApiProblem` (the same type every `servicesApi` call already resolves to on failure).
- **Returns**: `true` when `problem.code` matches `NETWORK_PROBLEM.code`, `SESSION_PROBLEM.code`, or
  `SERVER_PROBLEM.code`; `false` for every other code, including a missing/`undefined` code (spec
  FR-004 — "any other failure reported by the backend is blocking").
- Callers pass the result straight into `ConfirmDialog`'s `failure.transient`.

## Consumer contract (how a routine wires this)

A routine that needs a destructive confirmation:

1. Owns its own `useFetcher<typeof someAction>()` (or equivalent submission state) — `ConfirmDialog`
   never sees it directly.
2. Derives `isSubmitting`, and — when the fetcher has a failed result — a `failure` object via
   `{ message: <verbatim error message>, transient: isTransientProblem(result.error) }`.
3. Keeps its own `useEffect` (or equivalent) that fires a success toast when the fetcher settles with
   `ok: true`, then calls `onOpenChange(false)` — `ConfirmDialog` does not do this itself
   (research.md Decision 5).
4. Renders `<ConfirmDialog>` with its own static config (`title`, `description`, `confirmLabel`,
   `confirmIcon`, `blockedTitle`) plus the derived `isSubmitting`/`failure`/`onConfirm`.

`DeleteTagDialog.tsx` is the reference implementation of this pattern (spec US1) — after this feature,
it is exactly the four steps above with no dialog markup of its own left.

## Contract rules

- `confirm-dialog.tsx` MUST NOT import anything from `features/*` (constitution + `AGENTS.md`
  dependency direction; spec NFR-002).
- `confirm-dialog.tsx` MUST NOT call `useFetcher`, import `react-router`, or reference `ApiProblem`/
  `ApiResult` — those are the caller's concern (research.md Decision 1, 2).
- `confirm-dialog.tsx` MUST NOT call `toast.add` or import from `shared/ui/toast` (research.md
  Decision 5).
- Every routine's `blockedTitle` (and every other required prop) MUST be supplied explicitly — the
  component MUST NOT ship a generic factory default for it (research.md Decision 6).
- `isTransientProblem` MUST live in `shared/api/servicesFacade.ts`, not in `confirm-dialog.tsx` or in
  a feature slice (research.md Decision 2).
