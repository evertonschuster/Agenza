# Quickstart: Validating the Reusable Confirmation Dialog

This is a refactor (spec Assumptions: "preserving external behavior" is the bar, not new behavior),
so validation is mostly about proving **nothing observable changed** for Etiquetas (US1) plus proving
the new primitive is usable on its own, by configuration alone (US2).

## Prerequisites

- Backend + frontend running via Aspire (`backend/AppHost`) — constitution Principle VI, no
  standalone/mocked run. See [README.md](../../README.md) for the six `VITE_*` vars `shared/env.ts`
  requires.
- Logged in as the seeded demo tenant (`owner@demo.local`, per `e2e/helpers.ts`).
- At least one tag not applied to any service (for the plain-delete path) and one seeded in-use via
  `seedTagInUseByAService` from `e2e/helpers.ts` (for the blocked path) — both already used by
  `e2e/tags.spec.ts`, no new fixture needed.

## Automated validation (primary)

```bash
npm run test -- confirm-dialog DeleteTagDialog servicesFacade
npm run test:e2e -- tags.spec.ts
```

- `confirm-dialog.test.tsx` (new) exercises all three states — confirming, transient-with-retry,
  blocked — purely by passing different props, with no `DeleteTagDialog`/`Tag`/fetcher involved. This
  **is** the proof for US2 (spec's own Independent Test: "without requiring a second real screen").
- `DeleteTagDialog.test.tsx` (existing, adapted not rewritten) re-runs its 5 existing cases against the
  now-thinner adapter — proves FR-006 (no visible regression) at the unit level.
- `servicesFacade.test.ts` gains cases for the extracted `isTransientProblem` (research.md Decision 2).
- `e2e/tags.spec.ts`'s existing "deletes an unused tag" and "blocks deleting a tag in use" cases
  (spec US4/FR-008 in `specs/003-tags-crud`) exercise the real dialog end-to-end, unchanged in
  assertions — same visible text, same buttons.

Expected outcome: all of the above pass, and `npm run test:coverage`'s report lists
`confirm-dialog.tsx` with a real percentage — not absent via `coverage.exclude` (NFR-003).

## Manual walkthrough (maps to spec.md's acceptance scenarios)

1. **US1 / AC1 — plain delete**. Open `/tags`, pick a tag not used by any service, click delete, then
   "Excluir". Expect: success toast `"Etiqueta excluída" — "<name>" foi removida do catálogo.`, dialog
   closes, tag gone from the list.
2. **US1 / AC2 — cancel**. Open the delete dialog for any tag, click "Cancelar" (or Esc). Expect:
   nothing submitted, tag still in the list.
3. **US1 / AC3 — blocked**. Pick a tag applied to a service, click delete, then "Excluir". Expect: the
   dialog swaps to "Não é possível excluir" with the exact backend count
   ("...está em uso por N serviço(s)..."), a single "Entendi" button, no way to retry from there.
4. **US1 / AC4 — transient retry**. Hardest to trigger manually (needs a real network/server blip);
   rely on `DeleteTagDialog.test.tsx`'s mocked-failure case instead — it already covers this
   deterministically.

If all four match today's deployed behavior exactly (same copy, same button order, same states), FR-006
holds and the migration is safe to ship.
