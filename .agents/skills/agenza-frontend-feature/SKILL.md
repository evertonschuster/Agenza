---
name: agenza-frontend-feature
description: >
  Use for any React or TypeScript implementation under apps/admin-frontend,
  including pages, hooks, forms, domain models, repositories, contracts, auth,
  tests, and shared UI. Routes the task to the minimum relevant references and
  applies the repository's feature-oriented, Result-based frontend rules.
---

# Frontend feature

Read the root and frontend `AGENTS.md`, then inspect the live feature and tests.
Use only the additional reference required by the change:

| Change | Read |
| --- | --- |
| Repository, decoder, mapper, endpoint, generated type, MSW handler | [references/api-integration.md](references/api-integration.md) |
| Tests, fakes, wrappers, MSW setup | [references/testing.md](references/testing.md) |
| Page, form, dialog, table, component, visual behavior | [references/page-ui-conventions.md](references/page-ui-conventions.md) |
| Auth/session behavior | frontend ADR index: 004, 006, 007, 015 |
| Feature boundary/public API | frontend ADR index: 009 and current ESLint rules |

Do not open all references for a narrow task.

## Implementation rules

- Start from the code that owns the behavior; prose examples are never a file
  template.
- Domain factories validate untrusted values and return `Result`; mappers
  compose those results into curated `AppError` failures.
- Repository ports return domain values in `Result` and never receive
  `TenantContext` or choose tenant headers.
- Add a use-case class only for orchestration or policy. Pure pass-through
  facade operations keep the repository method shape.
- Construct concrete infrastructure only in `app/composition/container.ts`.
- Import another feature only through its public `index.ts`.
- Keep server-data hooks tenant-safe with `useAsync.resetKey`; keep routed
  tenant content below `TenantBoundary`.
- Runtime-decode external JSON even when generated TypeScript types exist.
- Promote code to `shared/` only after a real second identical use.
- Do not create generic CRUD/config-driven pages or speculative abstractions.

## Work sequence

Use only applicable steps:

1. Confirm the business rule and wire contract from live sources.
2. Change domain behavior and tests when invariants are involved.
3. Change the port/use-case boundary only when behavior requires it.
4. Update decoder, mapper, repository, and MSW coverage for external data.
5. Wire the facade/container without exposing concrete infrastructure.
6. Add the smallest accessible hook/page/form composition.
7. Update `docs/STATUS.md` only when usable feature state changed; update an ADR
   only when a durable architectural decision changed.
8. Run all frontend and governance gates from `apps/admin-frontend/AGENTS.md`.

Report actual gate results and unresolved contract or tenant risk.
