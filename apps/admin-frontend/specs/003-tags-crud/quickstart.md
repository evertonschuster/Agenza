# Quickstart: Validating Service Tags CRUD

## Prerequisites

- Backend + frontend running via Aspire (`backend/AppHost`) — this feature needs the real
  `services-service` and `identity-service`, per constitution Principle VI (no standalone/mocked
  run). See [README.md](../../README.md) for the six `VITE_*` vars `shared/env.ts` requires.
- Logged in as the seeded demo tenant (`owner@demo.local`, per `e2e/helpers.ts`).
- Visual reference while implementing:
  https://claude.ai/code/artifact/b7bc520f-3e32-4c2d-9692-734e88a7452f (approved prototype).

## Manual walkthrough (maps to spec.md's user stories)

Create and edit (US2–US3 below) were built and later removed — see `spec.md`'s Status line and
`docs/ARCHITECTURE.md` §5. Steps 2–3 describe a UI that no longer exists; kept for the historical
record, not as something to follow today. Delete (US4) was pulled out alongside them and later
reintroduced on its own — step 4 is walkable again.

1. **US1 — list & search**. Open the command palette (`Ctrl/⌘+K` or `/`) → "Etiquetas" (or navigate
   to `/tags` directly). Confirm every seeded tag shows name (as a colored chip), color, description.
   Type part of a name into the search field; confirm the list narrows to matches only. Clear it;
   confirm the full list returns.
2. ~~**US2 — create**. Click "Nova etiqueta" (or press `N`)...~~ — removed.
3. ~~**US3 — edit**. Open an existing tag, change its color, save...~~ — removed.
4. **US4 — delete**. Click a row's "Excluir" action; confirm it opens at `/tags/:id/delete` with the
   list still visible behind the dialog, naming the tag ("Excluir a etiqueta "X"?"). Confirm; the tag
   disappears from the list, refetched from the backend, and the dialog returns to `/tags`. Repeat for
   a tag associated with a service; confirm the backend's conflict message is shown verbatim instead
   (spec FR-008, FR-012) and the tag stays in the list.
5. **Theme**: repeat step 1 in dark mode — the chip colors stay legible (spec FR-010).

## Automated checks

```bash
npm run lint
npm run format:check
npx tsc --noEmit
npm run generate:api-types:check
npm run test:coverage
npm run test:e2e -- tags.spec.ts
```

All must pass before this feature is considered done (constitution Principle V). `tags.spec.ts` now
only covers reaching `/tags` — the create/edit/delete scenarios it used to run went with the UI they
exercised.
