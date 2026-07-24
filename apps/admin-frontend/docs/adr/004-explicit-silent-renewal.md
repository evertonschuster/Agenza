# ADR 004 — Explicit silent token renewal, not event-driven

**Status:** Accepted

## Decision

`automaticSilentRenew: false` in `UserManager`. Silent renewal is
handled explicitly inside `OidcAuthRepository.getCurrentSession()`.
Tokens with at most 60 seconds left are treated as expiring, and concurrent
callers share one in-flight renewal. A renewed session is accepted only when
both `user.id` and `tenant.id` match the cached session; a claim change clears
the local OIDC user and requires a full login.

## Rationale

Event-driven background renewal (`automaticSilentRenew: true`) fires
invisibly. When it fails, the application has no clean hook to force
logout — it only discovers the expired token on the next API call.
Explicit renewal gives the application full control: try renewal, clear
session on failure, return `null` so callers redirect to login.

The pre-expiry window avoids starting an API request with a token likely to
expire in transit. Single-flight renewal is required because every
authenticated HTTP request reads the current session; without it, parallel
requests can race two refresh-token exchanges and invalidate a rotated
refresh token.

## Consequences

- `getCurrentSession()` is the single choke point for renewal logic
- Renewal uses the refresh-token path supported by `oidc-client-ts` when
  the cached user has a refresh token (`offline_access` is requested)
- Tokens within the 60-second renewal window block on one shared renewal
- Session expiry is detected at the point of use (route check or page
  load), not proactively in the background
- Silent renewal latency is absorbed by the `ProtectedRoute` loading
  state rather than happening transparently in the background
- A failed renewal removes the stale OIDC user and returns `null`; the
  shared auth state then becomes unauthenticated and the protected route
  sends the user to login
- A renewal that changes the user or tenant is treated exactly like a failed
  renewal. This fail-closed check prevents a token for a new identity from
  being used while React still holds tenant-scoped state for the previous one
