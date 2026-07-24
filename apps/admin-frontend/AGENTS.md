# Admin Panel (frontend) — Agent Instructions

Read [../../AGENTS.md](../../AGENTS.md) first for repo-wide rules (question
policy, tenant scoping, exception policy, rule persistence). This file
covers what's specific to `apps/admin-frontend/`.

## What this project is

A multi-tenant SaaS admin panel for small healthcare/wellness businesses.
Built with Clean Architecture, TDD, and strict TypeScript, organized by
feature (ADR 009: `app/`, `features/{auth,catalog}/`, `shared/`). The Auth,
Tags, Categories, and Services verticals are complete end-to-end (frontend +
backend). The remaining feature verticals (Appointments, Clients, Inbox,
Dashboard, Settings) are stubs awaiting implementation, under `app/pages/`
until each graduates into its own feature.

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

### Architecture (ADR 009: `app/`, `features/{auth,catalog}/`, `shared/`)

- Every feature (`features/auth/`, `features/catalog/`) keeps its own
  `domain/ → application/ → infrastructure/`/`presentation/` layering
  inside it, dependencies pointing inward only. `domain/` and
  `application/` never import React, react-router, or anything from that
  feature's own `infrastructure/`/`presentation/` — ESLint enforces this
  per feature and in `shared/`, do not disable those rules.
- A feature's internals are reached from outside that feature **only**
  through its `index.ts` public API (`@/features/auth`, `@/features/catalog`)
  — never by importing a deep path into its `domain/application/
infrastructure/presentation`. ESLint (`no-restricted-imports`) and
  `scripts/architecture_guard.py`'s `check_cross_feature_internal_imports`
  both enforce this. Two narrow, documented exceptions: `src/test/**`
  (MSW fixtures need a feature's internal DTOs) and `app/routes/router.tsx`
  lazy-loading catalog's pages by their own path (code-splitting — see
  docs/adr/009's "Execution" section for why).
- Tags, Categories, and Services share one `features/catalog/` feature
  (not one each) — they collaborate in the same business context and
  cross-reference each other (a Service has a `categoryId` and `tags`).
- `app/composition/container.ts` is the ONLY place allowed to construct
  concrete repository/auth implementations. `AppContainer`'s public shape is
  `{ auth, catalog }` — grouped application facades, never a raw
  repository or `HttpClient` (docs/adr/008). Add a new use case to the
  matching facade's interface (`Pick<NewUseCase, 'execute'>`), not as a
  new top-level container field.
- `AppProviders` (`app/providers/`) receives an already-built `AppContainer`
  as a prop; it never calls `createAppContainer()` itself. `app/main.tsx`
  is the composition root — the only place that does.
- Every repository interface method takes `TenantContext` as first param.
- `useAuth()` (`features/auth`) is a pure consumer of `AuthProvider`'s
  shared session state — it has no state of its own. Never re-fetch the
  session from a page or hook directly; read `useAuth()` instead (docs/adr/006).
- `AuthenticatedHttpClient` (`shared/infrastructure/http/`) reads the
  access token and tenant id together from one `GetRequestSession` call
  per request (`shared/application/RequestSession.ts`) — never two
  independent reads, so they can't end up from different moments of a
  session transition. A 401/missing-session reaches `AuthProvider` through
  the `SessionEventBus` port (`shared/application/SessionEventBus.ts`), not
  a direct callback — infrastructure never imports React.
- Routed, tenant-scoped page content renders inside `TenantBoundary`
  (already wired in `AdminLayout`) so a session/tenant switch remounts it —
  don't bypass this with a page that renders outside `AdminLayout`'s
  `Outlet`.
- `presentation/` (in any feature, `shared/`, or `app/` outside
  `app/composition/`) must never import `infrastructure/` directly
  (ESLint-enforced). Any caught error is an `AppError`
  (`shared/application/AppError.ts`) by the time it reaches a hook/
  component — `AuthenticatedHttpClient` converts everything (missing
  session, 401, `ProblemDetails`, network/timeout failure) before it
  leaves infrastructure (docs/adr/007). Never render a caught error's raw
  `.message` directly for an unexpected/network/timeout/unauthorized
  failure — use the `AppError`'s own curated message.

### Comments — minimum of the minimum, by default zero

Default to no comment. This team is senior; identifiers, types, and
structure carry the meaning — a comment restating what a well-named
function/prop/hook already says is waste, not documentation. Add a
one-line comment (never a paragraph, never a JSDoc block on a clearly
named interface/hook/prop) only when a careful senior reviewer would
still get it wrong without it: a security/tenant-isolation default, a
concurrency/race guard, a genuine React/Radix/RHF/Zod/browser quirk, or
an unavoidable lint suppression. Architectural rationale belongs in
`docs/adr/` — reference it in one short clause at most (`see docs/adr/0006`),
never restate it. When in doubt, cut the comment; do not add one "to be
safe" or to explain a correction — fix the code/naming instead so the
comment isn't needed. This applies retroactively to existing code, not
just new code, and mirrors `backend/AGENTS.md`'s "Comments — minimal, by
default zero" — the same bar, applied here too.

### Componentization

- A page (`XPage.tsx`) is a composition shell: it wires a controller hook's
  view models into presentational components and renders nothing else. A
  controller hook (`useXPage`) follows the same single-responsibility bar —
  when it grows more than one real workflow (filters, editor, deletion,
  dirty-tracking are each their own concern), split it into focused hooks
  the page's controller composes, not one hook doing everything.
- Extract a component or hook on its _first_ use if it's already a distinct
  concern (a field group, a delete-confirmation dialog); keep it
  feature-local. Only _promote_ something to `shared/` on its _second_,
  genuinely-identical use across features — the "wait for the second use"
  rule gates promotion to `shared/`, not the initial extraction.
- `TagsPage` is the reference for _behavior and design_ (search → table →
  dialog create/edit → `AlertDialog` delete-confirm, loading/error/empty
  states) — not for _anatomy_. A feature with more workflows (Services:
  filters + pagination + dirty-tracking + inline-create) needs more files
  than Tags does; that's a correctly-sized decomposition, not a deviation.
- Decomposition triggers: multiple independent workflows in one
  hook/component, several dialogs, distinct state clusters, a prop list a
  reader can't hold in their head, a type cycle between a controller and
  the component it feeds, or a page test file so large it's hard to find
  the right assertion. There is no hard line-count cap — size alone is not
  a trigger, and splitting a genuinely cohesive 150-line component to hit
  a number is not the goal.
- `GenericCrudPage` (or any generic entity-agnostic CRUD abstraction) is
  prohibited. Tags/Categories/Services each keep their own page, form, and
  table — share only behavior that's proven identical (`useDialogTarget`,
  `useDeleteConfirmation`, `DeleteConfirmationDialog`,
  `CollectionFeedback`, all in `shared/`), never a config-driven generic
  page.

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
npm run test:coverage --workspace=apps/admin-frontend  # coverage gate, see docs/QUALITY.md
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
  genuinely needs right now — no speculative extensions. This directory
  and `src/lib/utils.ts` stay at these top-level paths regardless of ADR
  009's feature layout — moving shadcn-generated files would mean
  hand-editing their fixed `@/lib/utils` import convention.
- Style everything with semantic tokens (`bg-background`, `bg-card`,
  `text-foreground`, `text-muted-foreground`, `border-border`,
  `text-primary`, `text-destructive`) — never raw `slate-*`/`teal-*`
  Tailwind palette classes. Tokens are what make dark mode work; raw
  classes silently break it.
- A list of records is a `Table` (`src/components/ui/table.tsx`), not
  stacked `Card`s. A create/edit form always opens in a `Dialog`
  modal, never inline or as its own route.
- Build pages from `src/components/ui/` (shadcn/ui) and the shared
  composites in `shared/presentation/components/` (`PageHeader`,
  `StatusMessage`, `TextField`/`TextAreaField`, `CenteredScreen`,
  `FullScreenSpinner`, `CollectionFeedback`, `DeleteConfirmationDialog`)
  — don't hand-roll markup shadcn or an existing composite already covers.
- `TagsPage`/`TagForm` (`features/catalog/presentation/tags/`) is the
  reference implementation for a CRUD list+form page (table + dialog) —
  see "Componentization" above for what "reference" means here.
  `AdminLayout` (`app/layouts/`) is the reference for the page shell,
  including its off-canvas mobile sidebar — new pages don't need their
  own mobile nav handling.
- All user-facing text is Brazilian Portuguese (pt-BR) — labels,
  messages, `aria-label`s, confirm prompts. See "Language" in
  `agent-skills/agenza-frontend-feature`.
- Dark mode is controlled by `ThemeProvider`
  (`shared/presentation/providers/`): defaults to the OS preference, an
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
- ✅ Feature-based physical layout (`app/`, `features/{auth,catalog}/`, `shared/` — ADR 009)
- 🔲 Clients → Appointments → Inbox → Dashboard → Settings
