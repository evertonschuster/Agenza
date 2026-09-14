# Quickstart: Validating Service Tags CRUD

## Prerequisites

- Backend + frontend running via Aspire (`backend/AppHost`) — this feature needs the real
  `services-service` and `identity-service`, per constitution Principle VI (no standalone/mocked
  run). See [README.md](../../README.md) for the six `VITE_*` vars `shared/env.ts` requires.
- Logged in as the seeded demo tenant (`owner@demo.local`, per `e2e/helpers.ts`).
- Visual reference while implementing:
  https://claude.ai/code/artifact/b7bc520f-3e32-4c2d-9692-734e88a7452f (approved prototype).

## Manual walkthrough (maps to spec.md's user stories)

1. **US1 — list & search**. Open the command palette (`Ctrl/⌘+K` or `/`) → "Etiquetas" (or navigate
   to `/tags` directly). Confirm every seeded tag shows name (as a colored chip), color, description.
   Type part of a name into the search field; confirm the list narrows to matches only. Clear it;
   confirm the full list returns.
2. **US2 — create**. Click "Nova etiqueta" (or press `N`). Submit with no name → inline error under
   the name field, verbatim backend copy ("O nome da etiqueta é obrigatório."). Pick a color, submit
   a valid name → the tag appears in the list immediately, no reload. Re-submit the same name →
   banner error verbatim ("Já existe uma etiqueta chamada '…'."), dialog stays open.
3. **US3 — edit**. Open an existing tag, change its color, save → the list reflects the new color
   immediately. Rename it to another existing tag's name → banner conflict error, nothing is saved.
4. **US4 — delete**. Delete a tag with no service using it → confirm dialog → it disappears from the
   list. Attempt to delete a tag that a service uses (see e2e fixture note in research.md Decision 8
   for how to set this up without a Services UI) → dialog swaps to the blocked state with the exact
   service count from the backend, no delete occurs.
5. **Theme**: repeat step 1 in dark mode — every one of the 8 chip colors stays legible (spec
   FR-010).

## Automated checks

```bash
npm run lint
npm run format:check
npx tsc --noEmit
npm run generate:api-types:check
npm run test:coverage
npm run test:e2e -- tags.spec.ts
```

All must pass before this feature is considered done (constitution Principle V) — none of these are
new gates, `tags.spec.ts` is the only new file among them.
