# Contract: Generated API Client

The shape future features will consume to call `services-service` — this scaffold wires the client but does not call any business endpoint with it (spec: full OpenAPI client generation is out of scope; a stub is acceptable).

## Generation contract

- **Input**: `services-service`'s live OpenAPI document, `${SERVICES_API_OPENAPI_URL ?? 'http://localhost:5080/openapi/v1.json'}` (env override kept for CI, which starts AppHost headlessly — see `frontend-ci.yml`'s `api-contract-check` job).
- **Tool**: `openapi-typescript` (research.md Decision 6).
- **Output**: `src/shared/api/generated/services-api.d.ts` (research.md Decision 7) — generated, never hand-edited; regenerating and diffing is how `npm run generate:api-types:check` detects drift.
- **npm scripts** (required by root `package.json`'s `lint:frontend`/CI expectations, and by `frontend-ci.yml`'s `api-contract-check` job):
  - `generate:api-types` — regenerates `services-api.d.ts` from the live OpenAPI document.
  - `generate:api-types:check` — regenerates into a temp location, formats identically, and fails (non-zero exit) if it differs from the committed file.

## Runtime client contract

- `src/shared/api/apiClient.ts` exports exactly one factory, `createApiClient(session: Session): Client<paths>` (using `openapi-fetch`'s `paths` type from the generated file). This is the single entry point for calling `services-service` — no other module constructs a client.
- The returned client MUST attach on every request, via `openapi-fetch`'s middleware/interceptor mechanism (not left to each call site to remember):
  - `Authorization: Bearer <session.accessToken>` (mirrors how the OIDC session already holds the token).
  - `X-Tenant-Id: <tenantContext.tenantId>` — set automatically from the validated token's `tenant_id` claim, exactly matching ADR 0006's contract with `services-service`'s `TenantHeaderFilter`. Callers of the client MUST NOT be able to override this header per-call — there is no parameter for it.
- Components and features are forbidden from calling `fetch` directly, and from writing their own request/response DTOs, against `services-service` — every call goes through `createApiClient()` (constitution Principle IV). This is enforced by code review at this stage; an ESLint rule banning bare `fetch` outside `shared/api/` is a reasonable future hardening but isn't required by this feature.

## What this scaffold does NOT do

- Does not call any actual `services-service` business endpoint from the UI — there are no business routes/components to call one from yet (spec FR-013).
- Does not generate a client for `identity-service`'s own OpenAPI document — identity-service is consumed entirely through the OIDC protocol (`oidc-client-ts`), not through generated REST types; its OpenAPI/Scalar setup is for human API exploration only (research.md, Topic 2 of the original research pass).
