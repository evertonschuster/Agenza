# Phase 0 Research: OIDC-Authenticated Admin Shell Scaffold

Scope note: every decision below is derived from currently-live repository sources (constitution, ADRs, `backend/AppHost/AppHost.cs`, `.github/workflows/frontend-ci.yml`, `identity-service`/`services-service` source, root `package.json`/lockfile) or from idiomatic defaults for a scaffold of this size. None consult the admin-frontend implementation deleted in commit `f7fb154` — that was an explicit decision made during this planning session (see plan.md Summary).

## Decision 1: OIDC client library — `oidc-client-ts`

- **Decision**: Use `oidc-client-ts` for the Authorization Code + PKCE flow against identity-service.
- **Rationale**: ADR 0003 (`openiddict-identity-service`, accepted) is a currently-live, repo-wide architectural decision that explicitly states *"SPA: Authorization Code + PKCE (`oidc-client-ts`)"*. This governs any SPA authenticating against identity-service, not just a prior frontend — adopting anything else would contradict accepted governance.
- **Alternatives considered**: `react-oidc-context` (a React wrapper around `oidc-client-ts`) — rejected in favor of a small hand-written Context wrapper (Decision 2) to avoid an extra dependency for what's a thin integration; a hand-rolled PKCE implementation — rejected, reinventing a security-critical protocol is unjustified when a maintained library is already the accepted standard.

## Decision 2: Auth state exposure pattern — plain React Context, no DI container

- **Decision**: Wrap `oidc-client-ts`'s `UserManager` in a small `AuthProvider` (React Context) exposing a `useAuth()` hook; no dependency-injection container library.
- **Rationale**: The constitution defers "dependency injection pattern" to this plan. For a scaffold this size (one cross-cutting singleton: the auth/session client, plus the API client factory), React Context is the idiomatic, zero-dependency default — introducing a DI container (InversifyJS, tsyringe, etc.) would be speculative complexity with nothing yet to justify it.
- **Alternatives considered**: A DI container library — rejected as premature; module-level singletons with no Context — rejected because it complicates testing (Context makes swapping in a test double straightforward).

## Decision 3: Routing — React Router v7

- **Decision**: Use `react-router` (v7, "library mode") for client-side routing, protected-route redirects, and the `/callback` and `/login` routes already fixed by AppHost's `VITE_OIDC_REDIRECT_URI`/`VITE_OIDC_POST_LOGOUT_REDIRECT_URI`.
- **Rationale**: The de facto standard router for a Vite + React SPA; needed to implement the fail-closed redirect behavior in spec FR-001/FR-002 and the fixed callback/post-logout routes.
- **Alternatives considered**: TanStack Router — more type-safe route params but heavier setup for a scaffold with essentially one real route group; rejected as unjustified for this stage. Hand-rolled routing — rejected, reimplementing history/redirect handling is unnecessary risk.

## Decision 4: UI approach — Shadcn/ui on Tailwind CSS, remapped off the default `src/components/` path

- **Decision**: Render the shell (layout + placeholder navigation) using Shadcn/ui components on top of Tailwind CSS. Shadcn's CLI is configured (via `components.json`'s `aliases`) to install generated primitives into `src/shared/ui/` and its `cn()` helper into `src/shared/lib/utils.ts` — **not** its own default `src/components/ui/` and `src/lib/utils.ts` — so no top-level flat legacy directory is created, keeping every cross-cutting concern under `src/shared/` per FR-014.
- **Rationale**: Explicitly authorized and requested directly by the project owner, reversing this decision's earlier "no library yet" default. Shadcn/ui was chosen over the alternatives because it installs as owned component source (via its CLI) rather than a black-box npm dependency, is built on accessible Radix UI primitives well-suited to an admin panel that will grow data tables/dialogs/forms in later features, and bundles its own CSS framework requirement (Tailwind) so one choice satisfies both "UI library" and "CSS framework" at once. This settles one of the constitution's "Explicitly Deferred Decisions"; per the constitution's own governance clause, that's being recorded here and in plan.md's Technical Context (an ADR is also an option per the constitution's wording but wasn't requested for this pass).
- **Alternatives considered**: Tailwind CSS alone (no component library) — rejected, leaves nav/layout chrome hand-built from utility classes with no accessible-primitive foundation. MUI (Material UI) — rejected, heavier bundle and a strong opinionated visual identity that would need overriding for custom branding later. Keeping the original "no library" decision — rejected per explicit direction; revisiting it silently once a real feature needed UI was the fallback plan, but it's no longer the live decision.

## Decision 5: State / data-fetching library — none added

- **Decision**: No server-state library (TanStack Query, SWR, Redux, etc.) in this feature.
- **Rationale**: This scaffold makes no business API calls — the only "state" is the auth/session state already owned by `oidc-client-ts` and exposed via `AuthProvider`. Adding a data-fetching library with nothing to fetch would be speculative.
- **Alternatives considered**: Pre-adding TanStack Query "for later" — rejected; the constitution explicitly wants this decided per-feature, and the first feature that actually calls a business endpoint is better positioned to choose based on real requirements (caching needs, mutation patterns, etc.).

## Decision 6: API client generation — `openapi-typescript` + `openapi-fetch`

- **Decision**: Generate types from `services-service`'s OpenAPI contract with `openapi-typescript`, and construct the runtime client with `openapi-fetch` parameterized by those generated types.
- **Rationale**: `openapi-typescript` is already present in the root `package-lock.json` and is exactly what `frontend-ci.yml`'s existing `generate:api-types` / `generate:api-types:check` steps expect to run — both current, live facts independent of any prior implementation. However, `openapi-typescript` alone only generates *types*, not a runtime client; consuming those types with a hand-written `fetch` wrapper would risk violating constitution Principle IV ("Hand-written `fetch` calls... are forbidden"). Adding `openapi-fetch` — a minimal, schema-typed fetch wrapper designed specifically to consume `openapi-typescript` output — closes that gap: no hand-written request/response DTOs, and no hand-written `fetch` call sites once the client factory exists.
- **Alternatives considered**: NSwag/`swagger-typescript-api`/`orval` full client generators — rejected; the repo's OpenAPI setup (`Microsoft.AspNetCore.OpenApi` + Scalar, not Swashbuckle/NSwag) and existing lockfile/CI already point at the `openapi-typescript` toolchain, and switching generators would mean redoing the already-wired drift-check plumbing. Hand-written types + hand-written `fetch` — rejected as a direct Principle IV violation.

## Decision 7: Generated types file location

- **Decision**: Generated types live at `src/shared/api/generated/services-api.d.ts`, and the client factory at `src/shared/api/apiClient.ts`.
- **Rationale**: `frontend-ci.yml` contains a comment referencing an older path under `src/features/catalog/infrastructure/generated/` — but that path presupposes a `catalog` feature slice, which is a business feature explicitly out of scope for this scaffold (spec FR-013). Since the API client itself is cross-cutting infrastructure with no owning feature yet, `src/shared/api/` is the honest location; the stale comment in `frontend-ci.yml` will need a follow-up correction during implementation (it's prose only — the actual CI step just runs the npm script, so this is not a functional blocker).
- **Alternatives considered**: Keeping the old `src/features/catalog/...` path for comment-consistency — rejected, since no `catalog` feature is being built here and doing so would misrepresent scope.

## Decision 8: Session/error state taxonomy — small, feature-scoped set

- **Decision**: Model only the states this feature actually needs: `checking`, `unauthenticated`, `authenticating`, `authenticated`, `renewing`, `loggingOut`, and a small set of terminal failure reasons (`renewal_failed`, `identity_unreachable`, `missing_tenant_claim`) surfaced generically as "sign in again."
- **Rationale**: The constitution defers a full error taxonomy to be decided per-feature. Spec's edge cases only require distinguishing "can render the shell" from "must show the login redirect / a failure state" — a small closed set satisfies FR-009 and every edge case without designing error categories for business features that don't exist yet.
- **Alternatives considered**: A general-purpose app-wide error taxonomy (error codes, i18n message catalog, etc.) — rejected as premature; revisit once a business feature has real failure modes to categorize (e.g., validation errors, conflict errors).

## Decision 9: Logging approach — minimal in-app logger

- **Decision**: A small `shared/logger.ts` wrapping `console` (structured — event name + minimal metadata, no PII beyond tenant id), called from `features/auth/authEvents.ts` on login outcome, renewal failure, and logout (spec FR-015). No external telemetry/observability backend.
- **Rationale**: Directly implements the clarify-session decision (spec Clarifications, 2026-08-18): minimal local logging, no external service commitment before one is chosen.
- **Alternatives considered**: Already covered by the clarify session itself (options A/C were rejected there).

## Decision 10: Test layering strategy

- **Decision**: Vitest + React Testing Library + MSW for unit/component tests (mocking identity-service/services-service HTTP calls); Playwright for end-to-end tests that run against the real, locally Aspire-orchestrated stack (no mocking).
- **Rationale**: Vitest is constitutionally mandated. React Testing Library is the standard pairing. MSW's install script is already pre-authorized in root `package.json` (`allowScripts.msw: true`) — a current, live signal of intent. Playwright hitting the real stack (rather than mocks) is required by constitution Principle V's "real (non-mocked) OIDC smoke test."
- **Alternatives considered**: Mocking OIDC in Playwright too — rejected, directly contradicts Principle V's explicit "non-mocked" requirement.

## Decision 11: Dev CORS configuration — no change needed

- **Decision**: No changes to identity-service or services-service CORS configuration.
- **Rationale**: Both already allow `http://localhost:5173` in `appsettings.Development.json` (identity-service via a list `Cors:AllowedOrigins`, services-service via a single string `Cors:SpaOrigin`) — inconsistent shapes between the two services, but both already permit this scaffold's origin. Unifying that inconsistency is a backend-side cleanup outside this feature's scope.
- **Alternatives considered**: N/A — flagged only so the inconsistency isn't mistaken for something this feature needs to fix.

## Decision 12: Playwright real-login strategy — seeded DemoTenant account

- **Decision**: The Playwright e2e suite performs an actual interactive browser login using the seeded demo user (`owner@demo.local` / `Passw0rd!`, tenant `019f9b0b-e7fb-7ac6-84b7-5c8ed52c6120`), which `identity-service` provisions automatically when `DemoTenant` config is present (already true in `appsettings.Development.json`).
- **Rationale**: Research confirmed no automated test in this repo today drives an actual interactive Authorization Code + PKCE browser login — `scripts/smoke_oidc_contract.py` (Python, used by the `api-contract-check` CI job) only exercises machine-to-machine client-credentials flows. Constitution Principle V requires a real, non-mocked OIDC smoke test as part of *this* scaffold's own gates, and the demo tenant is the only currently-seeded interactive-login-capable account.
- **Alternatives considered**: Provisioning a fresh throwaway user per test run (as `smoke_oidc_contract.py` does for its M2M flows) — more isolated but adds setup complexity disproportionate to a scaffold with no per-test state to isolate; can be revisited if demo-tenant contention becomes a real problem.
- **Risk carried forward**: If `DemoTenant` config is ever removed from `appsettings.Development.json`, this Playwright test breaks — worth a code comment pointing back to this decision.

## Decision 13: OIDC discovery endpoint

- **Decision**: Configure `oidc-client-ts` with `authority: <identity-service URL>` and let it use standard OIDC discovery (`/.well-known/openid-configuration`).
- **Rationale**: OpenIddict (identity-service's underlying stack) serves its default discovery document unless explicitly narrowed, which Program.cs does not do. A real consumer (`ai-services/assistant-service`) already depends on the sibling `/.well-known/jwks` endpoint, corroborating discovery is live.
- **Alternatives considered**: Hand-configuring every endpoint (`authorization_endpoint`, `token_endpoint`, etc.) individually — kept as a documented fallback in `authClient.ts` comments in case discovery proves unavailable during implementation, since this one fact wasn't independently proven by an existing test in the repo.

## Decision 14: Coverage gate scope

- **Decision**: `vitest.config.ts` sets `coverage.include: ['src/**']` and excludes purely declarative wiring: `main.tsx`, `App.tsx`, `routes.tsx`, and the generated `shared/api/generated/**` file.
- **Rationale**: Matches the documented, currently-live convention in `docs/QUALITY.md` ("Excluded: declarative wiring (`main.tsx`, `App.tsx`, the route table)..."), so this scaffold's coverage gate is consistent with how the rest of the repo already defines "trivial."
- **Alternatives considered**: 100%-of-everything coverage — rejected; spec explicitly allows a trivial threshold at this stage, and excluding pure wiring is standard practice, not a loophole.

## Decision 15: Stale `frontend-ci.yml` comment

- **Decision**: Not fixed by this plan or by `/speckit-plan` itself (this phase only produces design docs under `specs/`); flagged here so it becomes a small implementation task.
- **Rationale**: The comment referencing `src/features/catalog/infrastructure/generated/services-api.d.ts` is prose only (doesn't affect what the CI step actually runs), but is now inaccurate given Decision 7. Leaving it uncorrected during implementation would mislead future readers.
- **Alternatives considered**: Editing `frontend-ci.yml` right now — rejected; out of phase for `/speckit-plan`, which produces `specs/**` design artifacts, not source/CI edits.
