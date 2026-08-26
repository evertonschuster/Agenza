# Implementation Plan: OIDC-Authenticated Admin Shell Scaffold

**Branch**: `001-oidc-shell-scaffold` | **Date**: 2026-08-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-oidc-shell-scaffold/spec.md`

## Summary

Scaffold a new Vite + React + TypeScript SPA at `apps/admin-frontend`, orchestrated locally through the already-wired Aspire `AddViteApp` resource (`backend/AppHost/AppHost.cs`), that authenticates against `identity-service` using OIDC Authorization Code + PKCE (`oidc-client-ts`, per ADR 0003) and resolves the tenant exclusively from the validated access token's `tenant_id` claim. Once logged in, it renders an empty authenticated shell (layout + placeholder navigation) organized as a feature-based/vertical-slice tree (per spec FR-014). No business features or full OpenAPI client are built. The shell's layout and navigation use Shadcn/ui components on Tailwind CSS (research.md Decision 4) — the one exception to an otherwise minimal scaffold, needed to satisfy the constitution's fixed CI quality gates (ESLint, Prettier, `tsc` strict, Vitest + coverage, Playwright with a real interactive OIDC login) and its auth/tenant/orchestration constraints.

This plan builds exclusively from currently-live sources of truth — `.specify/memory/constitution.md`, the repo's ADRs, `backend/AppHost/AppHost.cs`, `.github/workflows/frontend-ci.yml`, and `identity-service`/`services-service` source — and does not consult the admin-frontend implementation deleted in commit `f7fb154` (per explicit decision during planning).

## Technical Context

**Language/Version**: TypeScript ~5.9.3 (pinned repo-wide via root `package.json` `overrides`; ADR 0032 documents TS 7.x as currently incompatible with the typed ESLint gate), strict mode. React 19 (root `package.json` already carries `@types/react`/`@types/react-dom` `^19.x`).

**Primary Dependencies**: React 19 + Vite (current stable); `react-router` v7 for routing/protected-route redirects; `oidc-client-ts` for OIDC Authorization Code + PKCE (per ADR 0003 — this is a repo-wide, currently-accepted decision, not specific to any prior frontend); `openapi-typescript` for generating types from `services-service`'s OpenAPI contract (already present in the root lockfile and expected by `frontend-ci.yml`'s `generate:api-types`/`generate:api-types:check` scripts) plus `openapi-fetch` for a typed runtime client parameterized by those generated types (closes the "generated client" gap — see [research.md](./research.md) Decision 6); Tailwind CSS + Shadcn/ui (Radix UI primitives, installed as owned source via the Shadcn CLI, remapped to `src/shared/ui/`) for the shell's layout/navigation UI (research.md Decision 4); MSW for HTTP mocking in unit/component tests (root `package.json`'s `allowScripts.msw: true` pre-authorizes its install script).

**Storage**: N/A for app-level persistence. `oidc-client-ts`'s `UserManager` is configured with `userStore: new WebStorageStateStore({ store: window.localStorage })` — **not** the library's `sessionStorage` default. `sessionStorage` is isolated per browser tab by web-platform design and would silently break the spec's multi-tab edge case (a second tab must recognize an existing session rather than forcing a redundant login); `localStorage` is shared across same-origin tabs, satisfying it. `localStorage`'s wider XSS exposure surface relative to `sessionStorage` is accepted here since token handling is already fully delegated to `oidc-client-ts` and this scaffold executes no other first- or third-party script.

**Testing**: Vitest + React Testing Library + MSW for unit/component tests (with a coverage gate, per constitution Principle V); Playwright for end-to-end tests, including a real (non-mocked) interactive OIDC login against the locally Aspire-orchestrated `identity-service`, using the seeded `DemoTenant` account (`owner@demo.local` / tenant `019f9b0b-e7fb-7ac6-84b7-5c8ed52c6120`) — see [research.md](./research.md) Decision 12 for why this is new (no such test exists in the repo today) and how it stays reliable.

**Target Platform**: Web SPA, evergreen desktop browsers; served by Vite's dev server in local development, orchestrated by .NET Aspire (`AddViteApp`, already wired to port 5173).

**Project Type**: Single frontend application inside an existing multi-service monorepo (backend services already exist independently under `backend/`; this plan only concerns `apps/admin-frontend`).

**Performance Goals**: Not applicable at this stage — the shell has no data-heavy views yet (spec has no performance-related Success Criteria); revisit once business features add real data volume.

**Constraints**: Admin-frontend fixed at port 5173, identity-service at 5081, services-service at 5080 (all already wired in `backend/AppHost/AppHost.cs`, non-negotiable per constitution Principle III); Node.js `>=26.5.1` / npm `12.0.2` (root `.nvmrc` / `package.json`); npm workspace member (no independent package manager choice); no Docker — Aspire is the only local orchestrator (constitution Principle VI, ADR 0029); `tsconfig` strict, no implicit `any` (constitution Principle I); all backend calls MUST go through the generated OpenAPI-derived client, no hand-written `fetch`/DTOs (constitution Principle IV); tenant MUST be resolved only from the validated token's `tenant_id` claim, never from client-supplied input (constitution Principle II, spec FR-005/FR-006).

**Scale/Scope**: One SPA, one route group for this feature (`/`, `/callback`, `/login`, and an authenticated catch-all rendering the empty shell) — no business screens yet.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Strict TypeScript | PASS | `tsconfig.json` ships with `strict: true`; no suppressions planned. |
| II. Multi-Tenant Safety Enforced Server-Side | PASS | Tenant resolved only from the validated token's `tenant_id` claim (`features/auth/tenant.ts`); the `X-Tenant-Id` header the generated API client attaches mirrors that claim automatically (per ADR 0006) and is never populated from URL/query/localStorage (spec FR-005/FR-006). |
| III. Authentication via identity-service (Fixed Ports) | PASS | Uses the already-wired `admin-panel` OIDC client (port 5081) and admin-frontend's own fixed port 5173; no port renegotiation. |
| IV. Generated OpenAPI Client Only | PASS | `openapi-typescript` generates types from `services-service`'s live OpenAPI contract; `openapi-fetch` provides the runtime client parameterized by those types — no hand-written `fetch` calls or backend DTOs. See research.md Decision 6 for why a types-only generator alone would not fully satisfy this principle. |
| V. CI Quality Gates Non-Negotiable From Scaffold | PASS | ESLint, Prettier, `tsc` strict, Vitest + coverage, Playwright (incl. a real interactive OIDC login — new, see Decision 12), and the existing `frontend-ci.yml` drift check (`generate:api-types:check`) and `scripts/smoke_oidc_contract.py` are all targeted by this scaffold's npm scripts. |
| VI. No Frontend Docker | PASS | No Dockerfile planned; local orchestration is exclusively the existing Aspire `AddViteApp` resource. |

No violations. Complexity Tracking is not needed.

*Re-checked post-Phase 1: `data-model.md` and `contracts/*.md` introduce no new dependency, pattern, or data flow beyond what this table already covers — all six principles still PASS against the final design.*

*Re-checked post-`/speckit-analyze` remediation (2026-08-22): switching to `localStorage` (I1 fix, below) touches only Principle II's storage mechanism, not tenant-trust logic — the tenant id is still resolved exclusively from the validated token claim regardless of which Web Storage backend holds the session. Still PASS.*

## Project Structure

### Documentation (this feature)

```text
specs/001-oidc-shell-scaffold/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── env-contract.md
│   ├── routes-contract.md
│   └── api-client-contract.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/admin-frontend/
├── src/
│   ├── app/                          # Shell: root layout, providers, route table
│   │   ├── App.tsx
│   │   ├── AppLayout.tsx             # Layout + basic navigation (spec FR-004), built from src/shared/ui
│   │   ├── AppProviders.tsx          # Composes AuthProvider, router, etc.
│   │   ├── routes.tsx
│   │   └── globals.css               # Tailwind directives + Shadcn/ui CSS variables
│   ├── features/
│   │   └── auth/                     # Login/logout/silent-renewal/tenant resolution
│   │       ├── components/
│   │       │   ├── LoginRedirect.tsx # /callback handler: completes signinCallback()
│   │       │   └── SignInRedirect.tsx # /login trigger: calls authClient.signinRedirect()
│   │       ├── hooks/
│   │       │   └── useAuth.ts
│   │       ├── AuthProvider.tsx      # Wraps oidc-client-ts UserManager in React Context
│   │       ├── authClient.ts         # oidc-client-ts UserManager configuration (incl. localStorage store)
│   │       ├── ProtectedRoute.tsx    # Fail-closed route guard (spec FR-001, FR-009)
│   │       ├── tenant.ts             # Resolves tenant_id claim only (spec FR-005, FR-006)
│   │       ├── types.ts              # Session, Tenant Context, Authenticated User (data-model.md)
│   │       └── authEvents.ts         # Logs login/renewal/logout outcomes (spec FR-015)
│   ├── shared/
│   │   ├── api/
│   │   │   ├── generated/
│   │   │   │   └── services-api.d.ts # openapi-typescript output — generated, not hand-edited
│   │   │   └── apiClient.ts          # openapi-fetch client factory (attaches bearer + X-Tenant-Id)
│   │   ├── ui/                       # Shadcn/ui primitives (CLI-generated, owned source — not hand-styled)
│   │   ├── lib/
│   │   │   └── utils.ts              # Shadcn's cn() class-merging helper
│   │   ├── env.ts                    # Fail-fast loader/validator for the six VITE_* vars
│   │   └── logger.ts                 # Minimal in-app logger (spec FR-015)
│   ├── main.tsx
│   └── vite-env.d.ts
├── e2e/                               # Playwright specs (full-flow, not unit-scoped)
│   └── auth.spec.ts
├── scripts/
│   ├── generateApiTypes.mjs
│   └── checkGeneratedApiTypes.mjs
├── public/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── eslint.config.js
├── .prettierrc.json
├── .prettierignore
├── .env.example
└── components.json           # Shadcn CLI config — aliases remapped to src/shared/ui and src/shared/lib
```

Unit/component test files (`*.test.tsx` / `*.test.ts`) are colocated next to the source they cover (e.g., `src/features/auth/hooks/useAuth.test.ts`), consistent with Vitest + React Testing Library convention — no separate parallel `tests/` tree, so the vertical-slice layout (spec FR-014) isn't duplicated.

**Structure Decision**: Feature-based/vertical-slice layout as pinned by spec FR-014: `src/app/` for the shell itself, `src/features/auth/` for everything OIDC/session/tenant-related, `src/shared/` for the generated API client, Shadcn/ui primitives, and other cross-cutting code. Shadcn's CLI defaults to installing into a top-level `src/components/` and `src/lib/`, which FR-014 forbids as a legacy flat/global directory — `components.json` remaps both to `src/shared/ui/` and `src/shared/lib/` so every cross-cutting concern, UI included, stays under the one `src/shared/` bucket. `auth` is the only business-relevant "feature" in this scaffold; future business features (Categories, Services, Clients, etc.) will each get their own `src/features/<name>/` directory alongside it.

## Remediation Log (post-`/speckit-analyze`, 2026-08-22)

The following fixes were applied after the Specification Analysis Report; each is also reflected inline above.

- **I1 (Storage inconsistency)**: The Technical Context "Storage" entry now specifies `WebStorageStateStore({ store: window.localStorage })` instead of the `oidc-client-ts` `sessionStorage` default, so the spec's multi-tab edge case (second tab recognizes an existing session) is actually satisfiable rather than silently contradicted.
- **I2 (Tree completeness)**: The Project Structure tree now lists `src/shared/env.ts`, `src/features/auth/types.ts`, and `src/features/auth/components/SignInRedirect.tsx` — three files tasks.md always required but this tree previously omitted.

**Implementation-time correction (2026-08-23)**: Tailwind CSS was actually set up as v4 using its official `@tailwindcss/vite` plugin, not the PostCSS + `tailwind.config.ts` route this plan originally described — v4's Vite integration needs neither file (content is auto-detected; theme customization lives in `src/app/globals.css` via `@import 'tailwindcss'`). The tree above and Technical Context reflect the as-built state; `tailwind.config.ts`/`postcss.config.js` are correctly absent, not missing.

## Post-Implementation Architecture Refinement (2026-08-23)

After the scaffold was built and all tests were passing, a review against Clean Architecture / vertical-slice / modern-React conventions surfaced five gaps. All were fixed in place (no FR/task renumbering needed — the underlying tasks were already `[x]`; this is a quality pass on their implementation, not new scope):

1. **Extracted the session state machine out of `AuthProvider.tsx`.** The transition rules (what "authenticated" means, when a missing tenant claim fails closed, etc.) were previously inline inside a `useEffect`, mixing application logic with React wiring — a direct violation of Clean Architecture's Dependency Rule. They now live in `src/features/auth/sessionStore.ts` as a pure `reduceSession(event): AuthSnapshot` function with zero React or `oidc-client-ts` imports, tested directly in `sessionStore.test.ts` with no mocking required. `AuthProvider.tsx` shrank from ~145 lines to ~28.
2. **Adopted `useSyncExternalStore`** for subscribing to `oidc-client-ts`'s event emitter — the textbook-correct React 18+ primitive for external mutable state, replacing the previous manual `useState`/`useEffect`/ref-to-dodge-stale-closures pattern. `sessionStore` is the external store; `AuthProvider` just reads it.
3. **Added a barrel (`src/features/auth/index.ts`)** as the feature's only public surface, and a `no-restricted-imports` ESLint rule (`eslint.config.js`) that mechanically blocks any `@/features/*/*` deep import from outside the feature — enforcing FR-014's layering by tooling, not just convention. This immediately caught a real violation: `shared/api/apiClient.ts` was importing `Session`/`TenantContext` from `features/auth` (the reverse of the intended dependency direction). Fixed by having `createApiClient` accept a narrow `{ accessToken, tenantId }` shape instead of the feature's own types (contracts/api-client-contract.md updated to match).
4. **Added an `ErrorBoundary`** (`src/app/ErrorBoundary.tsx`) wrapping the app shell — previously an unexpected throw anywhere in the tree would white-screen with no fallback.
5. **Not changed, deliberately**: `AuthProvider`/`sessionStore` still import the `authClient` singleton directly rather than depending on an injected interface (research.md Decision 2's "no DI container" call). This trade-off was re-examined, not reversed — introducing a full ports-and-adapters seam for a single OIDC integration was judged premature for this scaffold's size; the cost (module-level mocking in tests, harder to swap the OIDC library later) is accepted, not overlooked.

Net effect at the time: 27/27 tests passing (up from 17 — the pure reducer made exhaustive edge-case coverage cheap), 87.04% statement coverage (up from 82.84%), lint/build/format all still clean. Since superseded by further work (a `loggingOut` status, an `AuthContext`/`AuthProvider` split, i18n, Tailwind theme tokens, and their tests) — see tasks.md T050 for the current totals.
