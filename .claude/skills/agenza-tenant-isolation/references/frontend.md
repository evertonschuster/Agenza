# Frontend — the tenant path, end to end

Five files, each with exactly one job. Everything in a review comes down to "did this change add a
sixth?".

| File (`apps/admin-frontend/src/`) | Job |
| --- | --- |
| `shared/session/tenant.ts` | The **only** place the `tenant_id` claim is decoded |
| `shared/session/sessionMachine.ts` | Pure reducer; a principal without the claim is not authenticated |
| `shared/session/sessionStore.ts` | Holds the snapshot; `getAuthCredentials()` is the only reader |
| `shared/api/apiClient.ts` | The **only** place `X-Tenant-Id` is written |
| `scripts/generateApiTypes.mjs` | Strips the header parameter from the generated types |

## Decode, do not verify

`resolveTenantContext` runs `atob` + `JSON.parse` over the payload segment and reads `tenant_id`.
It does **not** verify the signature, and it is not supposed to: the browser holds no key and has no
authority to grant itself one. Verification happens where the token is spent — JWT bearer validation
in the .NET services, `require_valid_token` in the AI service.

The reviewable consequence: **a decoded claim may drive routing and display, never a guarantee.**
Rendering a tenant name from it is fine. Deciding that a record is safe to show because the decoded
tenant matches is not — that decision belongs to the query filter on the server.

`resolveTenantContext` returns `null` on a missing claim, a malformed token, or a null token — one
funnel, and `resolveAuthenticated` turns that `null` into `failureReason: 'missing_tenant_claim'`,
which `isBlockingFailure` classifies as blocking. **A session with a token but no tenant is not a
degraded session; it is not a session.** Any change that lets it reach `authenticated` is a finding.

## The header has exactly one writer

`createApiClient`'s `onRequest` middleware reads `{ accessToken, tenantId }` fresh per request — a
getter, not a snapshot, so renewal and any future tenant change are picked up — and throws
`MissingSessionError` if either is absent. The facade turns that into `SESSION_PROBLEM`, which the UI
renders as "entre novamente", not as a network error.

Two rules follow, and both are grep-checkable:

- **Nothing else sets the header.** `X-Tenant-Id` is stripped from `services-api.d.ts` by
  `generateApiTypes.mjs` precisely so no call site *can*. A diff that re-adds it to the generated
  types, or sets it through `headers` on a `servicesApi` call, is removing that guarantee.
- **Never "fix" a 403 by sending a different tenant.** A `Tenant.ContextMismatch` means the header
  and the claim disagreed; the only correct response is to stop sending a hand-made header.

## Silent renewal and identity change

The gap named in `SKILL.md` §4, concretely. `sessionDriver` maps every `UserLoaded` — initial load
*and* silent renewal — through `toPrincipal` and dispatches `USER_LOADED`. `reduceSession` is a pure
function of the event alone, so the new snapshot simply replaces the old one. Nothing compares the
incoming `sub` / `tenant_id` against what was live a moment ago.

While no screen loads tenant data, nothing leaks. The moment one does, the failure is real: the
renewed token goes out on the next request under the new identity, while mounted components, loader
data and any cache still hold the previous tenant's rows.

What the fixing slice has to do:

- Carry `subject` on `SessionPrincipal` (it is dropped by `toPrincipal` today).
- On `USER_LOADED`, compare incoming `subject` + `tenantId` with the live snapshot; on a difference,
  clear the session and force a full login rather than swapping the credentials underneath the tree.
- That comparison needs the previous snapshot, which `reduceSession(event)` does not receive — so it
  is a genuine signature change to the reducer, not a two-line patch. Expect it to be its own PR.

## Caching and keys

There is no server-state library yet
([ADR 0035](../../../../docs/adr/0035-admin-frontend-no-server-state-library.md)); the router's
`loader` + revalidation is the plan. When one lands:

- A cache key derived **from the claim** is fine and desirable. A key derived from a route param or
  a query string is the exact thing constitution Principle II forbids — it makes a client-supplied
  value decide which rows a user sees out of the cache, entirely client-side, where no server check
  is reachable.
- Clearing the cache on identity change is part of the renewal fix above, not separate from it.

## Logging

`shared/logger.ts` carries `tenantId` and nothing else identifying — `sessionStore`'s auth events log
`{ tenantId, timestamp }`. That is the accepted PII boundary
([`docs/ARCHITECTURE.md` §5](../../../../apps/admin-frontend/docs/ARCHITECTURE.md)). Adding an email,
a name, or a raw token to a log line is a finding independent of tenancy.

## Tests

`makeAccessToken({ sub, tenant_id })` in `src/test/oidcUser.ts` mints a token that the real
`resolveTenantContext` then decodes — that is the sanctioned way to get a tenant into a test, and
`src/shared/session/tenant.test.ts` is the worked example.

What is not sanctioned, because it asserts a shape production does not have:

- Writing a tenant straight into the store snapshot, bypassing the claim.
- Mocking `getAuthCredentials` to return a tenant that no token ever contained.
- Asserting on a hand-set `X-Tenant-Id` instead of on the middleware attaching one
  (`src/shared/api/apiClient.test.ts` is the existing shape).
