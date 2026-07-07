# Admin Panel — AI Assistant Instructions

## What this project is

A multi-tenant SaaS admin panel for small healthcare/wellness businesses.
Built with Clean Architecture, TDD, and strict TypeScript. The Auth
vertical slice is complete. Feature verticals (Services, Appointments,
Clients, Inbox, Dashboard, Settings) are stubs awaiting implementation.

---

## Read these before doing any work

### Skills (how-to guides)

| Skill                                     | When to read                  |
| ----------------------------------------- | ----------------------------- |
| `.skills/admin-feature-vertical/SKILL.md` | Building any new feature      |
| `.skills/admin-api-contract/SKILL.md`     | User provides an API spec     |
| `.skills/admin-tdd-conventions/SKILL.md`  | Writing or debugging any test |

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
  concrete repository implementations.
- Every repository interface method takes `TenantContext` as first param.

### Testing

- Use case tests → hand-written fake repositories
- Infrastructure tests → MSW handlers (real HttpClient code path)
- Presentation tests → fake `AppContainer` via `AppContainerContext.Provider`
- `onUnhandledRequest: 'error'` — every HTTP call needs a registered MSW handler.

### Both must pass before every commit

```bash
npm run test    # all tests green
npm run build   # tsc catches what vitest/esbuild silently ignores
npm run lint    # architectural boundary rules enforced here
```

---

## Tech stack

- Vite 8 + React 19 + TypeScript 6 (strict)
- Tailwind CSS v4 (`@import "tailwindcss"` only — no config file)
- React Router v7
- oidc-client-ts (Auth Code + PKCE)
- Vitest + React Testing Library + MSW
- Husky + lint-staged

## Design language

Background `bg-slate-50` · Cards `bg-white border border-slate-200 rounded-xl`
Primary buttons `bg-teal-600 hover:bg-teal-700 text-white`
Headings `text-slate-800 font-semibold` · Body `text-slate-600` · Muted `text-slate-400`
Active `text-teal-700 border-teal-600`

## Environment

Copy `.env.example` to `.env.local`. Never commit `.env.local`.

---

## Current state (see docs/STATUS.md for full detail)

- ✅ Tooling, Auth vertical, composition root, presentation shell
- 🔲 `HttpClient` — needed before any REST feature, build this first
- 🔲 Services → Clients → Appointments → Inbox → Dashboard → Settings
