# Contract: Generated API Client

The shape future features will consume to call `services-service` — this scaffold wires the client but does not call any business endpoint with it (spec: full OpenAPI client generation is out of scope; a stub is acceptable).

## Generation contract

- **Input**: `services-service`'s live OpenAPI document, `${SERVICES_API_OPENAPI_URL ?? 'http://localhost:5080/openapi/v1.json'}` (env override kept for CI, which starts AppHost headlessly — see `frontend-ci.yml`'s `api-contract-check` job).
- **Tool**: `openapi-typescript` (research.md Decision 6). `generateApiTypes.mjs` fetches the document and strips the `X-Tenant-Id` header parameter from every operation before generating — `createApiClient`'s middleware sets that header, so call sites never see it. The strip runs in `generate()`, so `generate:api-types:check` stays consistent.
- **Output**: `src/shared/api/generated/services-api.d.ts` (research.md Decision 7) — generated, never hand-edited; regenerating and diffing is how `npm run generate:api-types:check` detects drift.
- **npm scripts** (required by root `package.json`'s `lint:frontend`/CI expectations, and by `frontend-ci.yml`'s `api-contract-check` job):
  - `generate:api-types` — regenerates `services-api.d.ts` from the live OpenAPI document.
  - `generate:api-types:check` — regenerates into a temp location, formats identically, and fails (non-zero exit) if it differs from the committed file.

## Runtime client contract

- `src/shared/api/apiClient.ts` exports exactly one factory, `createApiClient(getCredentials: () => { accessToken: string | null; tenantId: string | null }): Client<paths>` (using `openapi-fetch`'s `paths` type from the generated file). This is the single entry point for calling `services-service` — no other module constructs a client. The parameter is a getter rather than a static value so a client built once and reused stays correct across token renewal and tenant changes; its return shape is deliberately narrow and feature-agnostic rather than the `auth` feature's own `Session`/`TenantContext` types — `shared/` must not import from `features/*` (that's the reverse of the intended dependency direction, and is mechanically enforced by an ESLint `no-restricted-imports` rule); callers adapt their own richer types to this shape at the call site.
- The returned client MUST attach on every request, via `openapi-fetch`'s middleware/interceptor mechanism (not left to each call site to remember):
  - `Authorization: Bearer <accessToken>` (mirrors how the OIDC session already holds the token).
  - `X-Tenant-Id: <tenantId>` — set automatically from the validated token's `tenant_id` claim, exactly matching ADR 0006's contract with `services-service`'s `TenantHeaderFilter`. Callers of the client MUST NOT be able to override this header per-call — there is no parameter for it.
  - If `getCredentials()` returns a missing `accessToken` or `tenantId` at request time, the client fails closed — it throws instead of sending a request with one or both headers absent.
- Components and features are forbidden from calling `fetch` directly, and from writing their own request/response DTOs, against `services-service` — every call goes through `createApiClient()` (constitution Principle IV). This is enforced by code review at this stage; an ESLint rule banning bare `fetch` outside `shared/api/` is a reasonable future hardening but isn't required by this feature.

## Wiring (how features actually get the client)

Three layers, each with one job. A repository states none of: the token, the tenant, the API version, the response envelope, or exception handling.

- `src/shared/api/apiClient.ts` — `createApiClient(getCredentials)`. Its `client.use({ onRequest })` middleware attaches `Authorization: Bearer <token>` + `X-Tenant-Id` on every request, and fails closed (throws) with no session. Feature-agnostic.
- `src/features/auth` barrel exports **`getAuthCredentials()`** — a plain (non-React) reader over the session store singleton returning `{ accessToken, tenantId }` (never `Session`/`TenantContext`). Read fresh per request → survives silent renewal / tenant change.
- `src/shared/api/servicesFacade.ts` — `createServicesFacade(client)` returns a `ServicesApi` with `get` / `post` / `put` / `del`. It: injects the `v{version}` path segment so **callers pass no version** (and `X-Tenant-Id` is stripped from the generated types entirely — `generateApiTypes.mjs` removes it — so the middleware is its sole source); lifts the payload out of the `{ data, success, … }` success envelope; and returns every outcome as an `ApiResult<T>` (`{ ok: true, data } | { ok: false, error }`) — **it never throws**. On failure the `error` is the backend's own `ApiProblemDetails` (RFC 7807 `application/problem+json` — verified: every domain error carries `title` + a namespaced `code`), passed straight through **when the body carries a `title`**; a network rejection (`NETWORK_PROBLEM`) or any other body (`asProblem`) is synthesized into the same shape with `code: 'Http.Unexpected'`. The heavily-generic client is used loosely inside; the `ServicesApi` interface re-applies full path/query/body/response typing on the outside.
- `src/app/servicesApi.ts` — `export const servicesApi = createServicesFacade(createApiClient(getAuthCredentials))`. The composition root: the one place that imports both `@/shared/api` and `@/features/auth`.

A repository does `import { servicesApi } from '@/app/servicesApi'` and:

```ts
const result = await servicesApi.get('/api/v{version}/categories', { query: { Search } });
return result.ok ? ok(result.data.map(toDomain)) : result;   // no headers, no unwrap, no try/catch
```

`Result` / `ok` / `fail` live in `src/shared/result.ts`; `ApiResult<T>` (= `Result<T, ApiProblem>`) and `ApiProblem` (= the generated `ApiProblemDetails`) in `src/shared/api/apiProblem.ts`. The interface layer branches on `result.ok`, then on `result.error.code` (or `.status`), rendering `result.error.title` and reading `result.error.errors` directly — no exceptions cross into React.

## What this scaffold does NOT do

- Does not call any actual `services-service` business endpoint from the UI — there are no business routes/components to call one from yet (spec FR-013).
- Does not generate a client for `identity-service`'s own OpenAPI document — identity-service is consumed entirely through the OIDC protocol (`oidc-client-ts`), not through generated REST types; its OpenAPI/Scalar setup is for human API exploration only (research.md, Topic 2 of the original research pass).
