# Trace browser session and tenant data

The browser decodes tenant information for routing; server authentication and data scoping remain
the authority. Use the live implementation below rather than inferring protection from a header
or from the current number of tenant-related files.

## Session to request

Follow [tenant.ts](../../../../apps/admin-frontend/src/shared/session/tenant.ts),
[sessionMachine.ts](../../../../apps/admin-frontend/src/shared/session/sessionMachine.ts),
[sessionStore.ts](../../../../apps/admin-frontend/src/shared/session/sessionStore.ts) and
[apiClient.ts](../../../../apps/admin-frontend/src/shared/api/apiClient.ts).

- Decoding a claim does not verify its signature or grant access. The session reducer refuses
  authentication without the required subject/tenant, and the server validates the token.
- Keep the routing tenant tied to the access token. Do not let a route, query, form field or an
  independently stored tenant override it. OIDC library persistence of the token is not a separate
  tenant authority.
- The shared client reads credentials at request time and attaches the routing header. Missing
  token/tenant causes `MissingSessionError`, normalized by the
  [facade](../../../../apps/admin-frontend/src/shared/api/servicesFacade.ts).
  Features must not choose a different header to recover from a 403.
- The [generator](../../../../apps/admin-frontend/scripts/generateApiTypes.mjs) omits the tenant
  header from call-site types. This discourages accidental override; the backend still performs
  the security check.

## Identity changes and stale data

For [ADR 0083](../../../../docs/adr/0083-admin-frontend-reject-session-identity-changes.md), inspect
the reducer/store above, [sessionDriver](../../../../apps/admin-frontend/src/features/auth/model/sessionDriver.ts)
and [ProtectedRoute](../../../../apps/admin-frontend/src/features/auth/ui/ProtectedRoute.tsx).

Trace ordinary renewal separately from a change of subject or token-derived tenant. The changed
identity must latch the blocked state until explicit login, clear credentials, cancel the previous
request scope and unmount protected data. Inspect late initial reads, renewal events and replies.
The OIDC adapter stops renewal and attempts persisted-user removal; cleanup failure is logged,
not proof that the identity gate was released.

Transport cancellation does not undo a write already accepted by the server. Preserve lifecycle
guards for page-local navigation/effects and inspect any cache/store retaining protected data.
A cache key derived from the authenticated session can partition data but cannot authorize a
request. Reset or segregate stale data at the same identity boundary.

Do not assume an HTTP 401 updates the OIDC snapshot: trace the actual handler. An API error surface
and a session transition are different mechanisms.

## Tests and logging

For the decoding or identity boundary, construct principals with
[oidcUser.ts](../../../../apps/admin-frontend/src/test/oidcUser.ts) and use the real reducer/store
path. Compare with [tenant.test.ts](../../../../apps/admin-frontend/src/shared/session/tenant.test.ts)
and the relevant session tests.

For the request middleware seam, a credential getter double is legitimate:
[apiClient.test.ts](../../../../apps/admin-frontend/src/shared/api/apiClient.test.ts) checks header
attachment, fresh credentials and cancellation. It does not prove that those credentials came from
a validated token. Choose the seam for the property being tested, and describe its limits.

Inspect changed log fields and avoid raw tokens, claims payloads or identifying data that the
operation does not require. Existing auth logging is in the store; do not infer a repository-wide
PII policy from a file inventory or an old implementation diary.
