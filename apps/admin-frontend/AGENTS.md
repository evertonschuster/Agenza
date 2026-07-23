# Admin Panel (frontend) — Agent Instructions

Read [../../AGENTS.md](../../AGENTS.md) first for repo-wide rules (question
policy, tenant scoping, exception policy, rule persistence). This file
covers what's specific to `apps/admin-frontend/`.

## What this project is

A multi-tenant SaaS admin panel for small healthcare/wellness businesses.
Built with Clean Architecture, TDD, and strict TypeScript. The Auth, Tags,
Categories, and Services verticals are complete end-to-end (frontend +
backend). The remaining feature verticals (Appointments, Clients, Inbox,
Dashboard, Settings) are stubs awaiting implementation.

---

## Read these before doing any work

### Skills (how-to guides)

| Skill                                     | When to read                                              |
| ----------------------------------------- | --------------------------------------------------------- |
| `agent-skills/agenza-frontend-feature`    | Building any new feature vertical — canonical, portable   |
| `.skills/admin-api-contract/SKILL.md`     | User provides an API spec                                 |
| `.skills/admin-tdd-conventions/SKILL.md`  | Writing or debugging any test                             |
| `agent-skills/agenza-api-contract-review` | Auditing FE/BE contract drift (DTOs, enums, error shapes) |

### Docs (reference)

| Doc                 | When to read                                                  |
| ------------------- | ------------------------------------------------------------- |
| `docs/STATUS.md`    | Before starting any work — see what exists and what's blocked |
| `docs/DOMAIN.md`    | Before designing any domain entity                            |
| `docs/DECISIONS.md` | When a convention seems strange — the reason is in there      |
| `docs/API.md`       | Before building any infrastructure repository                 |
| `docs/adr/`         | Key architectural decisions with rationale                    |

---

## Critical constraints (non-negotiable)

### TypeScript

- `erasableSyntaxOnly: true` — NO constructor parameter property shorthand.
  Always explicit field declaration + `this.x = x` in the constructor body.
- `exactOptionalPropertyTypes: true` — use `if (value !== undefined) { this.field = value }`
  for optional fields. Never assign `this.field = maybeUndefined` directly.
- `noUncheckedIndexedAccess: true` — index access returns `T | undefined`. Always guard.
- `strict: true` — no `any`, ever.

### Architecture

- `domain/` and `application/` must never import React, react-router,
  or anything from `infrastructure/` or `presentation/`.
  ESLint enforces this — do not disable those rules.
- `composition/container.ts` is the ONLY place allowed to construct
  concrete repository implementations. `AppContainer`'s public shape is
  `{ auth, catalog }` — grouped application facades, never a raw
  repository or `HttpClient` (docs/adr/008). Add a new use case to the
  matching facade's interface (`Pick<NewUseCase, 'execute'>`), not as a
  new top-level container field.
- `AppProviders` receives an already-built `AppContainer` as a prop; it
  never calls `createAppContainer()` itself. `main.tsx` is the composition
  root — the only place that does.
- Every repository interface method takes `TenantContext` as first param.
- `useAuth()` is a pure consumer of `AuthProvider`'s shared session state —
  it has no state of its own. Never re-fetch the session from a page or
  hook directly; read `useAuth()` instead (see docs/adr/006).
- A 401/missing-token from `AuthenticatedHttpClient` reaches `AuthProvider`
  through the `SessionEventBus` port (`application/ports/SessionEventBus.ts`),
  not a direct callback — infrastructure never imports React.
- Routed, tenant-scoped page content renders inside `TenantBoundary`
  (already wired in `AdminLayout`) so a session/tenant switch remounts it —
  don't bypass this with a page that renders outside `AdminLayout`'s
  `Outlet`.
- `presentation/` must never import `infrastructure/` (ESLint-enforced).
  Any caught error is an `AppError` (`application/errors/AppError.ts`) by
  the time it reaches a hook/component — `AuthenticatedHttpClient` converts
  everything (missing token, 401, `ProblemDetails`, network/timeout
  failure) before it leaves infrastructure (see docs/adr/007). Never render
  a caught error's raw `.message` directly for an unexpected/network/
  timeout/unauthorized failure — use the `AppError`'s own curated message.

### Testing

- Use case tests → hand-written fake repositories
- Infrastructure tests → MSW handlers (real HttpClient code path)
- Presentation tests → fake `AppContainer` via `AppContainerContext.Provider`,
  built with `createFakeAppContainer({ auth: {...}, catalog: {...} })`
  from `src/test/fixtures/createFakeAppContainer.ts` — fully typed, no
  `as unknown as AppContainer` cast needed (docs/adr/008). Any component
  that (transitively) calls `useAuth()` also needs `AuthProvider` wrapped
  around it.
- `onUnhandledRequest: 'error'` — every HTTP call needs a registered MSW handler.
- `jest-axe` (`import { axe } from 'jest-axe'`, `expect(container).toHaveNoViolations()`)
  is available for accessibility assertions — the matcher is registered
  globally in `src/test/setup.ts`. Add it to any new or changed form/page
  that a screen-reader or keyboard-only user would rely on; see
  `TagForm.test.tsx` for the pattern.
- A form field wired through `Controller` (not `register()`) needs its
  rendered component to forward a `ref` to a real, focusable DOM node
  (`CreatableSingleSelect`/`CreatableMultiSelect` both do) - otherwise
  `setFocus(fieldName)` silently does nothing when a server error targets
  that field.
- A PUT body still includes the resource's own id even though the backend
  always overwrites it with the route id (docs/adr/0007, docs/adr/010) -
  build it explicitly against the generated `Update*Command` type, keyed
  on the same `id` the URL uses, never a separately-sourced value.
- A domain entity whose input can come from the generated API types
  (`number | string`-widened fields, docs/adr/010) must validate at
  runtime (finite, correct type, integer where required) in its `create()`
  factory - a type-level narrowing in the mapper is not enough. Store any
  externally-supplied array as a defensive copy, not by reference.
- `e2e/` holds a Playwright suite (`npm run test:e2e`) - separate from the
  Vitest unit/component suite and not part of its coverage gate. Runs
  against the production build (`vite build` + `vite preview`), not
  `vite dev`, since dev-only StrictMode effect double-invocation would
  make its request-count assertions nondeterministic. See "End-to-end
  tests" in docs/STATUS.md for what it covers, what's deliberately left to
  unit tests instead, and why it isn't wired into CI yet.

### Both must pass before every commit

```bash
npm run format:check --workspace=apps/admin-frontend
npm run lint --workspace=apps/admin-frontend
npm run build --workspace=apps/admin-frontend          # tsc catches what vitest/esbuild silently ignores
npm run test:coverage --workspace=apps/admin-frontend  # 80% line-coverage gate
```

(`npm run test`/`build`/`lint` without the `--workspace` flag work the
same way from inside `apps/admin-frontend/` itself — both forms run the
identical scripts; use whichever matches your current directory.) Also
run the repo-wide governance checks from
[../../AGENTS.md](../../AGENTS.md).

---

## Tech stack

- Vite 8 + React 19 + TypeScript 5.9 (strict) — pinned below `^6.x`/`7.x`
  until `openapi-typescript` (peer: `^5.x`) and `typescript-eslint` (peer:
  `<6.1.0`) both support newer TypeScript majors
- Tailwind CSS v4, CSS-variable theming (`src/index.css`) — no `tailwind.config.js`
- shadcn/ui (Radix UI primitives, `src/components/ui/`) + `lucide-react` icons
- React Router 8
- oidc-client-ts (Auth Code + PKCE)
- Vitest + React Testing Library + MSW
- Husky + lint-staged

## Design language

The stock shadcn/ui "Nova" theme, `neutral` base color, unmodified —
no custom brand color, no custom shadows/radius. Light + dark mode,
mobile down to 375px. Full detail — component inventory, the
semantic-token table, icon conventions, mobile checklist — lives in
`agent-skills/agenza-frontend-feature` (read it before building any
page). The short version:

- Use `src/components/ui/*` (shadcn/ui) exactly as the CLI generates
  them. Don't add props, variants, or styling beyond what a page
  genuinely needs right now — no speculative extensions.
- Style everything with semantic tokens (`bg-background`, `bg-card`,
  `text-foreground`, `text-muted-foreground`, `border-border`,
  `text-primary`, `text-destructive`) — never raw `slate-*`/`teal-*`
  Tailwind palette classes. Tokens are what make dark mode work; raw
  classes silently break it.
- A list of records is a `Table` (`src/components/ui/table.tsx`), not
  stacked `Card`s. A create/edit form always opens in a `Dialog`
  modal, never inline or as its own route.
- Build pages from `src/components/ui/` (shadcn/ui) and the shared
  composites in `src/presentation/components/` (`PageHeader`,
  `StatusMessage`, `TextField`/`TextAreaField`, `CenteredScreen`,
  `FullScreenSpinner`) — don't hand-roll markup shadcn or an existing
  composite already covers.
- `TagsPage`/`TagForm` is the reference implementation for a CRUD
  list+form page (table + dialog). `AdminLayout` is the reference for
  the page shell, including its off-canvas mobile sidebar — new pages
  don't need their own mobile nav handling.
- All user-facing text is Brazilian Portuguese (pt-BR) — labels,
  messages, `aria-label`s, confirm prompts. See "Language" in
  `agent-skills/agenza-frontend-feature`.
- Dark mode is controlled by `ThemeProvider`
  (`src/presentation/providers/`): defaults to the OS preference, an
  explicit toggle (in `AdminLayout`'s sidebar footer) persists to
  `localStorage` after that. Check every new page in both themes.

## Environment

Copy `.env.example` to `.env.local`. Never commit `.env.local`.

---

## Current state (see docs/STATUS.md for full detail)

- ✅ Tooling, Auth vertical, composition root, presentation shell
- ✅ `HttpClient` (`AuthenticatedHttpClient`) — REST features are unblocked
- ✅ shadcn/ui design system, dark mode, mobile-responsive `AdminLayout`
- ✅ Tags, Categories, Services (frontend + backend, search/filtering, pagination)
- 🔲 Clients → Appointments → Inbox → Dashboard → Settings
