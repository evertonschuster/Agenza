# Admin frontend — agent instructions

Read [../../AGENTS.md](../../AGENTS.md) first. This file contains only
durable rules specific to `apps/admin-frontend/`; current feature progress
belongs in [docs/STATUS.md](docs/STATUS.md), package versions belong in
`package.json`, and decision rationale belongs in [docs/adr/README.md](docs/adr/README.md).

## Read by task

| Task                                 | Read                                            |
| ------------------------------------ | ----------------------------------------------- |
| Any React/TypeScript feature change  | `.agents/skills/agenza-frontend-feature`        |
| Backend/frontend contract audit      | `.agents/skills/agenza-api-contract-review`     |
| Exploratory screen/accessibility QA  | `.agents/skills/agenza-frontend-exploratory-qa` |
| Current implementation status        | `docs/STATUS.md`                                |
| Domain terminology or a new entity   | `docs/DOMAIN.md`                                |
| REST endpoint or generated type work | `docs/API.md` and the generated OpenAPI types   |
| Architectural rationale              | `docs/adr/README.md`, then only the routed ADRs |

Do not read every frontend document by default. Inspect the code and config
that own the behavior before relying on prose.

## Non-negotiable architecture

- Keep feature internals under `src/features/<feature>/{domain,application,
infrastructure,presentation}`. Dependencies point inward. Domain and
  application do not import React or infrastructure/presentation.
- Outside a feature, import through its `index.ts`; the narrow test and route
  lazy-loading exceptions are enforced by ESLint and
  `scripts/architecture_guard.py`.
- `src/app/composition/container.ts` is the only place that constructs concrete
  repositories, auth adapters, or `AuthenticatedHttpClient`. `src/app/main.tsx`
  is the composition root.
- A facade entry mirrors a repository method directly when it is only a
  pass-through. Introduce a use-case class when it owns orchestration or policy,
  not merely to add an `execute` wrapper.
- Repository methods do **not** accept `TenantContext`. The
  `AuthenticatedHttpClient` obtains the access token and tenant id atomically
  from `GetRequestSession` and attaches both `Authorization` and
  `X-Tenant-Id`. Feature repositories never set or choose tenant headers.
- Tenant-scoped UI state must clear synchronously on tenant change. Hooks built
  on `useAsync` pass the tenant id as `resetKey`; routed content stays inside
  `TenantBoundary`.
- Expected domain, auth, HTTP, decode, network, and backend failures flow as
  `Result` values. `AuthenticatedHttpClient` is the global technical boundary
  that converts caught failures to `AppError`; hooks/components do not parse
  raw exceptions or render arbitrary `.message` values.
- A feature's generated OpenAPI type is the contract source when one exists.
  Do not hand-maintain a shadow DTO for the same wire shape.

## TypeScript

- `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, and
  `erasableSyntaxOnly` stay enabled.
- Never use `any`. Narrow `unknown` at boundaries.
- Declare constructor fields explicitly; parameter-property shorthand is not
  allowed.
- Guard optional assignments instead of assigning a possibly-`undefined`
  value directly.

## UI and presentation

- Use the existing shadcn/ui primitives and shared composites before creating
  new ones. Do not introduce a competing design system.
- Use semantic color tokens, not raw Tailwind palette colors. Support light and
  dark themes and a 375 px viewport.
- All user-facing and assistive text is Brazilian Portuguese.
- Interactive elements need accessible names and keyboard operation. Add
  `jest-axe` coverage to new or materially changed routed pages/forms.
- Pages are composition shells over focused controller hooks. Extract a local
  component for a distinct concern; promote it to `shared/` only after a second
  genuinely identical cross-feature use. Generic entity-agnostic CRUD pages are
  prohibited.
- Comments default to zero. Keep a short comment only for a non-obvious
  security default, concurrency guard, library/browser quirk, or necessary lint
  suppression. Architectural rationale belongs in an ADR.

## Testing

- Domain: pure tests, no mocks.
- Application: hand-written repository fakes returning `Result` values.
- Infrastructure: MSW at the HTTP boundary; every request has a handler and
  `onUnhandledRequest: 'error'` remains enabled.
- Presentation: a typed fake `AppContainer`; add `AuthProvider` and router
  wrappers only when the subject requires them.
- Do not replace expected `Result.failure` paths with rejected promises in
  fakes. Rejections are reserved for tests of the global unexpected-failure
  boundary.

## Required gates

```bash
npm run format:check --workspace=apps/admin-frontend
npm run lint --workspace=apps/admin-frontend
npm run build --workspace=apps/admin-frontend
npm run test:coverage --workspace=apps/admin-frontend
```

Also run the repo-wide governance commands from [../../AGENTS.md](../../AGENTS.md).
