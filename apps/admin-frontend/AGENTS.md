# Admin frontend — agent instructions

Read [../../AGENTS.md](../../AGENTS.md) first. This file contains durable rules
for `apps/admin-frontend/`. Current progress belongs in
[docs/STATUS.md](docs/STATUS.md); versions belong in `package.json`; rationale
belongs in the frontend ADR index.

## Load by task

| Task | Read |
| --- | --- |
| React/TypeScript implementation | `../../.agents/skills/agenza-frontend-feature` |
| API contract drift | `../../.agents/skills/agenza-api-contract-review` |
| Exploratory UI/accessibility QA | `../../.agents/skills/agenza-frontend-exploratory-qa` |
| Current feature state | `docs/STATUS.md` |
| Confirmed domain terminology | `docs/DOMAIN.md` |
| REST/generated contract work | `docs/API.md` and generated OpenAPI types |
| Rationale | `docs/adr/README.md`, then only the relevant ADR |

Inspect live code and config before prose. Do not load every frontend document.

## Architecture

- Feature code lives under
  `src/features/<feature>/{domain,application,infrastructure,presentation}`;
  dependencies point inward.
- Outside a feature, import through its `index.ts`. ESLint and
  `scripts/architecture_guard.py` define the narrow test/route exceptions.
- Concrete repositories, auth adapters, and `AuthenticatedHttpClient` are
  constructed only in `src/app/composition/container.ts`.
- A use-case class exists only for orchestration or policy. Pure repository
  pass-throughs keep the repository method shape in the facade.
- Repository methods never receive or choose a tenant id. `TenantContext` is an
  authenticated UI/session value; it is not a repository argument.
  `AuthenticatedHttpClient` reads one atomic request-session snapshot and adds
  both the access token and `X-Tenant-Id`.
- Tenant-owned UI state resets synchronously on tenant change. Server-data hooks
  use the tenant id as `useAsync.resetKey`, and routed tenant content remains
  inside `TenantBoundary`.
- Expected domain, auth, HTTP, decode, network, and backend failures use
  `Result`. Only the global technical boundary converts unexpected thrown
  failures to curated `AppError` values.
- Generated OpenAPI types are the wire-contract source when available. Never
  hand-maintain a shadow DTO for the same payload.

## TypeScript and presentation

- Keep strict TypeScript, `exactOptionalPropertyTypes`,
  `noUncheckedIndexedAccess`, and `erasableSyntaxOnly` enabled.
- Never use `any`; narrow `unknown` at external boundaries.
- Use explicit constructor fields, not parameter-property shorthand.
- Prefer existing shadcn/ui primitives and shared composites. Do not add a
  competing design system or a generic entity-configured CRUD page.
- User-facing and assistive text is pt-BR. Use semantic color tokens, keyboard
  operation, accessible names, light/dark support, and a 375 px viewport.
- Pages compose focused hooks and components; repositories never reach
  presentation directly.
- Comments explain only non-obvious security, concurrency, browser/library, or
  lint constraints.

## Testing

- Domain: pure tests.
- Application: hand-written repository fakes returning `Result`.
- Infrastructure: MSW through the real HTTP boundary; unhandled requests fail.
- Presentation: typed fake `AppContainer`; add providers only when required.
- Add `jest-axe` coverage for new or materially changed routed pages/forms.
- Rejected promises are reserved for the unexpected-failure boundary; expected
  fake failures resolve `Result.failure`.

## Required gates

```bash
npm run format:check --workspace=apps/admin-frontend
npm run lint --workspace=apps/admin-frontend
npm run build --workspace=apps/admin-frontend
npm run test:coverage --workspace=apps/admin-frontend
```

Also run the repository governance commands from the root instructions.
