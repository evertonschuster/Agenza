# admin-frontend — Architecture

A pragmatic map of how this app is built and **why it looks the way it does**. It
summarises decisions taken across the OIDC-shell work and the API-layer iterations;
for the blow-by-blow see [`specs/001-oidc-shell-scaffold/`](../specs/001-oidc-shell-scaffold/).

§1–§5 describe what's settled. **§6 is the honest counterpart** — what's a placeholder,
what we consciously left out, and what doesn't exist yet. Read both.

Two rules of thumb behind everything here:

- **Abstraction proportional to the problem.** Lean wiring, invested domain structure.
  "Código bom é código não escrito" — the simplest thing that is correct _and_ explicit.
- **The types protect you from forgetting.** Version, tenant, response envelope, wire
  drift — that cost is paid once, in `shared/`, so no call site ever restates it.

---

## 1. Shape

```
src/
├── app/                     Composition root — providers, route table, layout, ErrorBoundary
├── features/<slice>/        One vertical slice per user-facing capability (auth, categories, …)
│   ├── model/               Types + rules. No React. ( = domain + application )
│   ├── api/                 Backend gateway — repositories. ( = infrastructure )
│   ├── ui/                  Everything that imports React
│   │   └── pages/<Page>/    One folder per route: <Page>.tsx (shell) + use<Page>.ts (logic)
│   └── index.ts             The slice's ONLY public surface
└── shared/                  Cross-cutting, no business logic
    ├── api/                 servicesApi facade, generated types, apiClient
    ├── ui/                  shadcn/ui primitives (owned source), lib/utils.ts (cn())
    ├── env.ts               Fail-fast loader for the six VITE_* vars
    └── logger.ts            Minimal structured console wrapper
```

**Feature-Sliced Design segments**, chosen over `domain/application/infrastructure/presentation`
folders: same principles, less nesting, names any dev reads immediately. A segment's purity is
proven by its mock-free tests, not by its folder name.

**Dependency direction** — enforced, not just intended:

- `app` → `features` → `shared`. Never the reverse; `shared/` must not import from `features/*`.
- Within a slice: `ui` → `model` / `api`, and `api` → `model`. The domain entity is defined in
  `model/` and imported by the layers that use it — the wire layer never owns it.
- A slice is reachable only through its `index.ts`. An ESLint `no-restricted-imports` rule blocks
  `@/features/*/*` (reaching past the barrel) from outside the slice. Relative imports inside a
  slice are unaffected.

**Route pages are shells.** `<Page>.tsx` holds no `useEffect`/`useState`/`useRef` of its own; all
effect and state logic lives in that page's **own** hook (`useLoginRedirect`, `useAuthCallback`, …).
Hooks are never shared between pages — the one exception is a pure Context accessor like `useAuth`.
Sub-components go in a `components/` subfolder, created only when a page actually grows them.

---

## 2. Talking to the backend

Three layers, each stating exactly one thing. A repository states **none** of: the token, the
tenant, the API version, the response envelope, or exception handling.

| Layer            | File                                     | Job                                                                                                                                                |
| ---------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client           | `shared/api/apiClient.ts`                | `openapi-fetch` client; middleware attaches `Authorization: Bearer` + `X-Tenant-Id`, fails closed with no session. Feature-agnostic.               |
| Credentials      | `features/auth` → `getAuthCredentials()` | Non-React reader over the session store; returns `{ accessToken, tenantId }`, read fresh per request.                                              |
| Facade           | `shared/api/servicesFacade.ts`           | `servicesApi` (`get`/`post`/`put`/`del`). Injects `v{version}` into the path, unwraps the `{ data, success, … }` envelope, returns `ApiResult<T>`. |
| Composition root | `app/servicesApi.ts`                     | `createServicesFacade(createApiClient(getAuthCredentials))` — the one place that imports both `@/shared/api` and `@/features/auth`.                |

**`servicesApi` never rejects.** `run()` (the whole of it) is a `try/catch`:

- `2xx` → `ok(payload)` — payload lifted out of the envelope, typed from the OpenAPI spec.
- `non-2xx` with an RFC 7807 `application/problem+json` body → `fail(problem)` verbatim.
- a thrown fetch (offline, DNS, connection refused) → `fail(NETWORK_PROBLEM)`.
- a `non-2xx` whose body isn't a Problem (a gateway 5xx, an empty error) → `fail(SERVER_PROBLEM)`.

`NETWORK_PROBLEM` / `SERVER_PROBLEM` are `ApiProblem`s (`status: 0`, namespaced `code`) exported
from the facade — the UI branches on them exactly like a backend Problem. Because the one place
that turns HTTP into `ApiResult` also owns a failed transport, **a repository does zero exception
handling and a page has no `try/catch`.**

**A repository is a thin typed delegation.** Its domain entity (`Category`) is hand-written, owned
by the frontend (not `components['schemas']['…']`), and lives in `model/`. When the entity is
structurally what the endpoint returns, the repository forwards the result verbatim — the return
annotation is the one compile-time checkpoint against a breaking wire change. A `toDomain(dto)`
mapper is added only when wire and domain genuinely diverge.

```ts
// features/categories/api/categoryRepository.ts
import type { Category } from '../model/category';

export const categoryRepository = {
  list: (filter: CategoryListFilter = {}): Promise<ApiResult<Category[]>> =>
    servicesApi.get('/api/v{version}/categories', {
      query: filter.search ? { Search: filter.search } : {},
    }),
};
```

**Errors are values, never exceptions.** `Result<T, E> = { ok: true; data } | { ok: false; error }`
with `ok()` / `fail()` in `shared/result.ts` — custom, ~6 lines, no library. No `unwrap()`-that-throws.
The interface layer branches on `result.ok`, then on `result.error.code` / `.status`, renders
`result.error.title`, reads `result.error.errors` directly.

Full wiring detail: [`contracts/api-client-contract.md`](../specs/001-oidc-shell-scaffold/contracts/api-client-contract.md).

---

## 3. Auth & tenancy

- **OIDC Authorization Code + PKCE** against `identity-service` via `oidc-client-ts` (no
  `react-oidc-context` wrapper, no hand-rolled PKCE).
- **`AuthProvider`** wraps the `UserManager` in a plain React Context; `useSyncExternalStore`
  subscribes to its event emitter. No DI container.
- **Session state machine** is a pure `reduceSession(event): AuthSnapshot` in
  `features/auth/model/sessionMachine.ts` — zero React, zero `oidc-client-ts` imports, tested
  directly with no mocking. `AuthProvider` just reads the store.
- **Tenant comes only from the validated access token's `tenant_id` claim.** Never from URL,
  query, or `localStorage`. The `X-Tenant-Id` header is attached by `apiClient`'s middleware and
  is **stripped from the generated types** (`generateApiTypes.mjs`) so no call site can set it.
  Mirrors backend [ADR 0006](../../../docs/adr/0006-tenant-header-base-entity-generic-repository.md).
- **Fail closed.** `ProtectedRoute` redirects when the session isn't `authenticated`; the client
  throws rather than send a request with a missing token or tenant.

---

## 4. Principles

- **No `what` comments, no JSDoc.** Code self-documents (senior team). A terse `why` comment is
  allowed only for a genuine race or a non-obvious constraint.
- **No exceptions for control flow.** `Result` end to end.
- **The facade is smart so call sites are dumb.** You never restate `version`, `X-Tenant-Id`, the
  envelope, or error handling — the architecture protects against forgetting them. The type
  machinery in `servicesFacade.ts` looks heavy but every derivation buys a caller guarantee
  (`CallOptions` hides version + forbids a body on a GET; `Payload` makes a breaking wire change
  fail to compile). Simplifying further would mean pushing that work onto every repository.
- **Pages are shells; logic is in the page's own hook.**
- **Types over folder names.** A layer is "pure" because its tests need no mocks.

---

## 5. Decisions log

Chosen, and — just as important — tried and backed out of, so nobody re-litigates:

| Decision                                                           | Rationale                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FSD segments over `domain/application/infrastructure/presentation` | Practice-oriented reading of the same principles, less nesting.                                                                                                                                                                                                                                                              |
| Custom `Result` (not neverthrow / Effect)                          | ~6 lines, no dependency, no `unwrap`-that-throws.                                                                                                                                                                                                                                                                            |
| `openapi-typescript` + `openapi-fetch`, kept                       | A hand-rolled typed client would be _more_ code (URL/query/path serialization, content negotiation).                                                                                                                                                                                                                         |
| No server-state library (TanStack Query, SWR, …)                   | Not needed yet; a route loader or query lib is the eventual home for cache/refetch.                                                                                                                                                                                                                                          |
| Error normalization **inside `run()`**                             | A short-lived call-site `settle(call)` wrapper was tried and removed — it was one more thing every caller had to remember. The HTTP layer owns it.                                                                                                                                                                           |
| **No request-cancellation layer**                                  | An `AbortController` threaded through the facade + a `useApiResource` hook was built twice and reverted twice: awkward to use, and React's `ignore`-flag on the effect already fixes the only real bug (a stale response landing after unmount). Revisit only if a concrete need appears (search-as-you-type, large export). |
| `Category` entity in `model/`, not `api/`                          | The UI was reaching through to the backend layer just for a domain type — inverted dependency.                                                                                                                                                                                                                               |
| Removed `lucide-react`, `msw`                                      | Zero imports anywhere; `msw` was never wired (tests use `vi.mock`).                                                                                                                                                                                                                                                          |
| shadcn/ui + Tailwind, remapped to `shared/ui` + `shared/lib`       | Owned component source over a black-box dep; accessible Radix primitives suit a growing admin panel; one choice covers "UI library" + "CSS framework".                                                                                                                                                                       |
| Minimal in-app logger, no telemetry backend                        | `shared/logger.ts` wrapping `console`, structured, no PII beyond tenant id.                                                                                                                                                                                                                                                  |

---

## 6. Deferred, provisional & not-yet-built

Not everything above is set in stone, and not everything the specs describe is implemented —
because it didn't need to be yet. This is the compiled view across the whole app.

### Provisional — works, but expected to change

- **`features/categories/` is a harness, not a reference feature.** It exists only to exercise the
  API layer end to end against a running backend (list / create / update over one endpoint). It
  will be rebuilt as a real feature and is slated to become the first `entities/` slice. Copy the
  `model` / `api` / `ui` split from it — nothing else.
- **`CategoriesPage.tsx`** still holds `useState` / `useEffect` directly instead of being a shell
  over its own hook (§1). Acceptable for a harness; align it on the rebuild.
- The original scaffold spec (**FR-013**) said the shell must expose _no_ business feature.
  `categories` was added afterwards, deliberately, to have something real calling the backend — a
  conscious departure, not a violation to "fix".

### Deliberately not built — no need yet

| Not built                                              | Why not                                                                                      | Build it when                                           |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `entities/` and top-level `pages/` FSD layers          | Nothing is shared across features yet                                                        | A second feature needs the same entity or page          |
| Server-state library (TanStack Query, SWR)             | One page, one fetch-on-mount                                                                 | Caching, refetch-on-focus, or request dedup is wanted   |
| Request-cancellation layer (`AbortController`)         | The effect `ignore`-flag already fixes the race; nothing is slow enough to abort on the wire | Search-as-you-type, a large export                      |
| `toDomain(dto)` mappers                                | `Category` is structurally identical to the wire type                                        | A wire shape and a domain type genuinely diverge        |
| Ports/adapters seam for OIDC (injected `authClient`)   | One integration; module-mock in tests is acceptable                                          | A second identity provider, or the mock cost turns real |
| Broad OpenAPI client generation                        | Only `categories` endpoints are called                                                       | The next business feature is wired                      |
| ESLint rule banning bare `fetch` outside `shared/api/` | Small surface, caught in review                                                              | The surface grows, or a bare `fetch` slips in           |
| `identity-service` typed client                        | Consumed purely through the OIDC protocol                                                    | Never — it's protocol, not REST                         |
| External telemetry / observability backend             | `shared/logger.ts` → `console` is enough                                                     | A real ops requirement appears                          |
| A consumer for `servicesApi.del`                       | The facade provides it, but no endpoint needs `DELETE`                                       | A repository calls it                                   |

### Pages that don't exist yet

Routing today is `/login`, `/callback`, and `/categories` — everything else redirects to
`/categories`. Navigation is a single link. No dashboard, no Services / Clients / Appointments /
Settings. Each will be its own `src/features/<name>/` slice (with `ui/pages/<Page>/`) when built.

---

## 7. Toolchain & gates

React 19 · Vite · strict TypeScript (`exactOptionalPropertyTypes`, `verbatimModuleSyntax`,
`noUnusedLocals`) · Tailwind 4 · `react-router` v8 for client-side routing.

CI gates (all must pass): `tsc --noEmit`, ESLint (`recommendedTypeChecked` + `react-hooks` +
`no-explicit-any` as error + the feature-boundary `no-restricted-imports`), Prettier `--check`,
Vitest + coverage, `generate:api-types:check` (regenerate the OpenAPI types and fail on drift),
and Playwright e2e against the **real** Aspire-orchestrated stack (a seeded demo login, no mocks).

Unit/component tests use Vitest + React Testing Library with module mocks (`vi.mock` / `vi.hoisted`)
— no network-level mocking. Test files are colocated next to their source.

---

## 8. Pointers

- API wiring, in full — [`specs/001-oidc-shell-scaffold/contracts/api-client-contract.md`](../specs/001-oidc-shell-scaffold/contracts/api-client-contract.md)
- Routes / env contracts — [`contracts/routes-contract.md`](../specs/001-oidc-shell-scaffold/contracts/routes-contract.md), [`contracts/env-contract.md`](../specs/001-oidc-shell-scaffold/contracts/env-contract.md)
- Feature-planning history & the 15 scaffold decisions — [`plan.md`](../specs/001-oidc-shell-scaffold/plan.md), [`research.md`](../specs/001-oidc-shell-scaffold/research.md)
- Backend contracts this app depends on — [ADR 0003](../../../docs/adr/0003-openiddict-identity-service.md) (OIDC), [ADR 0006](../../../docs/adr/0006-tenant-header-base-entity-generic-repository.md) (tenant header), [ADR 0005](../../../docs/adr/0005-cqrs-vertical-slice-result-pattern.md) / [ADR 0014](../../../docs/adr/0014-result-pattern-domain-and-persistence-no-exceptions.md) (Result pattern)
