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
│   │   └── pages/<Page>/    One folder per route: <Page>.tsx (shell) + use<Page>.ts (form
│   │                        state) + route.ts (loader/action), all re-exported by index.ts
│   └── index.ts             The slice's ONLY public surface
└── shared/                  Cross-cutting, no business logic
    ├── api/                 servicesFacade, servicesApi (its composition), apiClient,
    │                        unwrap (Result → exception at the framework boundary), generated types
    ├── session/             Session core — no identity-provider knowledge
    │   ├── sessionMachine.ts   pure reducer, reduceSession(event): AuthSnapshot
    │   ├── sessionStore.ts     snapshot, subscribe, dispatch, getAuthCredentials
    │   ├── session.ts          types, including SessionPrincipal
    │   └── tenant.ts           decode the tenant_id claim from the access token
    ├── ui/                  shadcn/ui primitives (owned source), lib/utils.ts (cn())
    ├── env.ts               Fail-fast loader for the six VITE_* vars
    └── logger.ts            Minimal structured console wrapper
```

**Feature-Sliced Design segments**, chosen over `domain/application/infrastructure/presentation`
folders: same principles, less nesting, names any dev reads immediately. A segment's purity is
proven by its mock-free tests, not by its folder name.

**Dependency direction** — enforced, not just intended:

- `app` → `features` → `shared`. Never up: `shared/` imports neither `features/` nor `app/`, and
  `features/` never imports `app/`.
- Within a slice: `ui` → `model` / `api`, and `api` → `model`. The domain entity is defined in
  `model/` and imported by the layers that use it — the wire layer never owns it.
- **Functional core, imperative shell** — and the one `model → api` edge it still needs. The pure
  core (`sessionMachine.ts`'s `reduceSession(event): AuthSnapshot`, plus `session.ts`, `tenant.ts`,
  `sessionStore.ts`) sits in `shared/session/` and carries no OIDC reference at all — not even
  `import type`. The shell is `features/auth/model/sessionDriver.ts`: it subscribes to the
  `oidc-client-ts` `UserManager` events, maps a `User` to a `SessionPrincipal`, and dispatches into
  the shared store. That `sessionDriver` → `../api/authClient` import is the `model → api` edge, kept
  inside `auth`. The core dropping a layer is exactly what lets `shared/api/servicesApi.ts` compose
  the facade over `getAuthCredentials` with nothing reaching up
  ([ADR 0037](../../../docs/adr/0037-admin-frontend-session-core-in-shared.md)).
- The whole direction is mechanically enforced, not just the barrel. Three `no-restricted-imports`
  blocks in the flat config: the base bans `@/features/*/*` (reaching past a slice's `index.ts`)
  everywhere; `src/shared/**` additionally may not import `@/features/*` or `@/app/*`; `src/features/**`
  may not import `@/app/*`. Relative imports inside a slice are unaffected. Flat-config gotcha (noted
  in `eslint.config.js`): a later block's `no-restricted-imports` **replaces** the base one for
  matching files rather than merging, so each block restates every pattern it must keep — the
  `src/features/**` block repeats the `@/features/*/*` barrel ban.

**Route pages are shells.** `<Page>.tsx` holds no `useEffect`/`useState`/`useRef` of its own; all
effect and state logic lives in that page's **own** hook (`useLoginRedirect`, `useAuthCallback`,
`useCategoriesPage`, …). Hooks are never shared between pages — the one exception is a pure Context
accessor like `useAuth`. Sub-components go in a `components/` subfolder, created only when a page
actually grows them.

**A page's `loader` and `action` live in `ui/pages/<Page>/route.ts`** and are re-exported from the
slice barrel, so `app/routes.tsx` wires them by importing `@/features/<slice>` — the dependency
still runs `app → features`. Server data reaches the shell through `useLoaderData()` /
`useActionData()` / `useNavigation()`, never through page-owned state. `categories` is the worked
example (§6).

---

## 2. Talking to the backend

Three layers, each stating exactly one thing. A repository states **none** of: the token, the
tenant, the API version, the response envelope, or exception handling.

| Layer       | File                                                      | Job                                                                                                                                                                                                                                                                                                                 |
| ----------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client      | `shared/api/apiClient.ts`                                 | `openapi-fetch` client; middleware attaches `Authorization: Bearer` + `X-Tenant-Id`, fails closed with no session. Feature-agnostic.                                                                                                                                                                                |
| Credentials | `shared/session/sessionStore.ts` → `getAuthCredentials()` | Non-React reader over the session store; returns `{ accessToken, tenantId }`, read fresh per request.                                                                                                                                                                                                               |
| Facade      | `shared/api/servicesFacade.ts`                            | `servicesApi` (`get`/`post`/`put`/`del`). Injects `v{version}` into the path, unwraps the `{ data, success, … }` envelope, returns `ApiResult<T>`.                                                                                                                                                                  |
| Composition | `shared/api/servicesApi.ts`                               | `createServicesFacade(createApiClient(getAuthCredentials))`. Every import is `shared/*`, so the wiring lives in `shared/` and no repository ever reaches up to `app/` for a client — the inversion the `shared/session` move ([ADR 0037](../../../docs/adr/0037-admin-frontend-session-core-in-shared.md)) removed. |

**`servicesApi` never rejects.** `run()` (the whole of it) is a `try/catch`:

- `2xx` → `ok(payload)` — payload lifted out of the envelope, typed from the OpenAPI spec.
- `non-2xx` with an RFC 7807 `application/problem+json` body → `fail(problem)` verbatim.
- no authenticated session — the client's middleware threw `MissingSessionError` → `fail(SESSION_PROBLEM)`.
- a thrown fetch (offline, DNS, connection refused) → `fail(NETWORK_PROBLEM)`.
- a `non-2xx` whose body isn't a Problem (a gateway 5xx, an empty error) → `fail(SERVER_PROBLEM)`.

`SESSION_PROBLEM` / `NETWORK_PROBLEM` / `SERVER_PROBLEM` are `ApiProblem`s (`status: 0`, namespaced
`code`) exported from the facade — the UI branches on them exactly like a backend Problem. Splitting
`SESSION_PROBLEM` out of the transport bucket is what keeps an expired session from reading as "no
connection". Because the one place that turns HTTP into `ApiResult` also owns a failed transport,
**a repository does zero exception handling and a page has no `try/catch`.**

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

**`Result` is the internal currency; the framework boundary is the cashier.** `servicesApi` never
rejects, but React Router and TanStack Query signal failure _only_ by a rejected promise — a
`loader` or `queryFn` that returns `{ ok: false, error }` reads as success. `shared/api/unwrap.ts`
converts, in exactly one place:

| Boundary               | Converts?                          | Why                                                                                        |
| ---------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------ |
| `repository → loader`  | `unwrapOrThrow`                    | the router signals failure only by rejection                                               |
| `repository → queryFn` | `unwrapOrThrow`                    | same; without it every query resolves "ok" with an error inside                            |
| `action` / mutation    | **no** — `Result` straight through | a validation error (400 with `errors`) is expected flow and returns to the form as a value |
| below that             | no                                 | plain `Result`; no new `try/catch`                                                         |

_"`Result` é a moeda interna; a fronteira do framework é o caixa."_

> The third row is the one that gets misread. A dead network is exceptional; "name already taken"
> is not. Routing both down the rejection path turns validation into an error screen.

Full wiring detail: [`contracts/api-client-contract.md`](../specs/001-oidc-shell-scaffold/contracts/api-client-contract.md).

---

## 3. Auth & tenancy

- **OIDC Authorization Code + PKCE** against `identity-service` via `oidc-client-ts` (no
  `react-oidc-context` wrapper, no hand-rolled PKCE).
- **`AuthProvider`** exposes the session snapshot through a plain React Context;
  `useSyncExternalStore` subscribes to the `shared/session` store. The `UserManager`'s event
  emitter is wired to that store by `sessionDriver` (below), not by the provider. No DI container.
- **Session state machine** is a pure `reduceSession(event): AuthSnapshot` in
  `shared/session/sessionMachine.ts` — zero React, zero `oidc-client-ts` (not even `import type`),
  tested directly with `SessionPrincipal` fixtures and no mocking. `AuthProvider` reads the store
  from `shared/session` and drives it through `startListening` / `login` / `logout` in
  `features/auth/model/sessionDriver.ts`.
- **Tenant comes only from the access token's `tenant_id` claim** — never from URL, query, or
  `localStorage`. The frontend only **decodes** that token: `shared/session/tenant.ts` runs
  `atob` + `JSON.parse` on the payload and reads the claim; it does not verify the signature, and
  isn't meant to. The `X-Tenant-Id` header `apiClient`'s middleware attaches from that claim is a
  **routing convenience, not a security boundary** — it's also **stripped from the generated types**
  (`generateApiTypes.mjs`) so no call site can set it by hand. The boundary is the backend refusing
  any request whose header doesn't match its own validated token claim:
  [ADR 0006](../../../docs/adr/0006-tenant-header-base-entity-generic-repository.md).
- **Fail closed.** `ProtectedRoute` redirects when the session isn't `authenticated`; the client
  throws `MissingSessionError` rather than send a request with a missing token or tenant, and the
  facade surfaces that to the UI as `SESSION_PROBLEM` ("entre novamente"), not a network error.

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

| Decision                                                           | Rationale                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FSD segments over `domain/application/infrastructure/presentation` | Practice-oriented reading of the same principles, less nesting.                                                                                                                                                                                                 |
| Custom `Result` (not neverthrow / Effect)                          | ~6 lines, no dependency, no `unwrap`-that-throws; the boundary conversion is single-sited in `shared/api/unwrap.ts` — [ADR 0034](../../../docs/adr/0034-admin-frontend-custom-result-type.md).                                                                  |
| `openapi-typescript` + `openapi-fetch`, kept                       | A hand-rolled typed client would be _more_ code (URL/query/path serialization, content negotiation).                                                                                                                                                            |
| No server-state library (TanStack Query, SWR, …)                   | The route `loader` + `action` + RR revalidation cover one screen; when a query lib lands it **replaces** the repository — [ADR 0035](../../../docs/adr/0035-admin-frontend-no-server-state-library.md).                                                         |
| Error normalization **inside `run()`**                             | A short-lived call-site `settle(call)` wrapper was tried and removed — it was one more thing every caller had to remember. The HTTP layer owns it.                                                                                                              |
| **No request-cancellation layer**                                  | Facade `AbortController` + `useApiResource` built and reverted twice; the effect `ignore`-flag fixes the only real bug. Revisit for search-as-you-type or a large export — [ADR 0033](../../../docs/adr/0033-admin-frontend-no-request-cancellation-layer.md).  |
| `Category` entity in `model/`, not `api/`                          | The UI was reaching through to the backend layer just for a domain type — inverted dependency.                                                                                                                                                                  |
| Removed `lucide-react`, `msw`                                      | Zero imports anywhere; `msw` was never wired (tests use `vi.mock`).                                                                                                                                                                                             |
| shadcn/ui + Tailwind, remapped to `shared/ui` + `shared/lib`       | Owned component source over a black-box dep; accessible Radix primitives suit a growing admin panel; one choice covers "UI library" + "CSS framework".                                                                                                          |
| Minimal in-app logger, no telemetry backend                        | `shared/logger.ts` wrapping `console`, structured, no PII beyond tenant id.                                                                                                                                                                                     |
| OIDC session kept in `localStorage`                                | A second tab reuses the session; accepted threat is an XSS on our origin reading the token; in-memory + `httpOnly` cookie rejected (needs a backend change) — [ADR 0036](../../../docs/adr/0036-admin-frontend-oidc-session-in-localstorage.md).                |
| Session core in `shared/session`                                   | Store, reducer and tenant decode moved out of `features/auth` / `app/` so the composition descends with them; no feature imports `app/`, and ESLint now enforces both directions — [ADR 0037](../../../docs/adr/0037-admin-frontend-session-core-in-shared.md). |

---

## 6. Deferred, provisional & not-yet-built

Not everything above is set in stone, and not everything the specs describe is implemented —
because it didn't need to be yet. This is the compiled view across the whole app.

### Provisional — works, but expected to change

- The original scaffold spec (**FR-013**) said the shell must expose _no_ business feature.
  `categories` was added afterwards, deliberately, to have something real calling the backend — a
  conscious departure, not a violation to "fix".
- **`features/categories/` is now the reference slice**, not a harness: loader on the route, page
  as a shell, `route.ts` owning `categoriesLoader` / `categoriesAction`, form state confined to
  `useCategoriesPage`, and a `CategoriesRouteError` that renders an `ApiProblem` through
  `FullScreenMessage`. Copy its `model` / `api` / `ui/pages/<Page>/` shape for a new feature. It is
  still expected to seed the first `entities/` slice once a second consumer of `Category` appears.

### Deliberately not built — no need yet

| Not built                                              | Why not                                                                                      | Build it when                                           |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `entities/` and top-level `pages/` FSD layers          | Nothing is shared across features yet                                                        | A second feature needs the same entity or page          |
| Server-state library (TanStack Query, SWR)             | One page; the route `loader` + `action` + RR revalidation cover fetch / mutate / refetch     | Cross-route caching, refetch-on-focus, or optimistic UI |
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
`no-explicit-any` as error + `no-restricted-imports` enforcing both the feature barrel and the
`app → features → shared` layer direction), Prettier `--check`,
the Vitest run (CI invokes `test:coverage`, whose `vitest.config.ts` thresholds are a real gate —
85% statements, lines and functions, 80% branches, chosen with headroom so a genuine regression
fails CI without tripping on small-file noise), `generate:api-types:check` (regenerate the
OpenAPI types and fail on drift), and Playwright e2e against the **real** Aspire-orchestrated stack
(a seeded demo login, no mocks).

Unit/component tests use Vitest + React Testing Library with module mocks (`vi.mock` / `vi.hoisted`)
— no network-level mocking. Test files are colocated next to their source.

---

## 8. Pointers

- API wiring, in full — [`specs/001-oidc-shell-scaffold/contracts/api-client-contract.md`](../specs/001-oidc-shell-scaffold/contracts/api-client-contract.md)
- Routes / env contracts — [`contracts/routes-contract.md`](../specs/001-oidc-shell-scaffold/contracts/routes-contract.md), [`contracts/env-contract.md`](../specs/001-oidc-shell-scaffold/contracts/env-contract.md)
- Feature-planning history & the 15 scaffold decisions — [`plan.md`](../specs/001-oidc-shell-scaffold/plan.md), [`research.md`](../specs/001-oidc-shell-scaffold/research.md)
- Backend contracts this app depends on — [ADR 0003](../../../docs/adr/0003-openiddict-identity-service.md) (OIDC), [ADR 0006](../../../docs/adr/0006-tenant-header-base-entity-generic-repository.md) (tenant header), [ADR 0005](../../../docs/adr/0005-cqrs-vertical-slice-result-pattern.md) / [ADR 0014](../../../docs/adr/0014-result-pattern-domain-and-persistence-no-exceptions.md) (Result pattern)
