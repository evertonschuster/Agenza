# Quickstart: Validating Service Tags CRUD

## Prerequisites

- Backend + frontend running via Aspire (`backend/AppHost`) — this feature needs the real
  `services-service` and `identity-service`, per constitution Principle VI (no standalone/mocked
  run). See [README.md](../../README.md) for the six `VITE_*` vars `shared/env.ts` requires.
- Logged in as the seeded demo tenant (`owner@demo.local`, per `e2e/helpers.ts`).
- Visual reference while implementing:
  https://claude.ai/code/artifact/b7bc520f-3e32-4c2d-9692-734e88a7452f (approved prototype).

## Manual walkthrough (maps to spec.md's user stories)

1. **US1 — list & search**. Open "Etiquetas" from the sidebar (the bottom nav's "Mais" on narrow
   screens) or the command palette (`Ctrl/⌘+K` or `/`), or navigate to `/tags` directly. Confirm
   every seeded tag shows name (as a colored chip), color, description. Type part of a name into the
   search field and submit it with Enter or "Buscar"; confirm the list narrows to matches only, and
   that typing alone never searches (spec FR-002). Clear the field and submit again; confirm the full
   list returns.
2. **US2 — create**. Click "Nova etiqueta" (or press `N`), fill name and color, save (or
   `Ctrl/⌘+S`); confirm the dialog closes and the tag shows in the list. Repeat with a name already
   in use; confirm the backend's duplicate-name message is shown verbatim (spec FR-004, FR-012).
3. **US3 — edit**. Click a row's "Editar" action, change its color, save; confirm the list shows the
   new color.
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
