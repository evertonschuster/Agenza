# ADR 004 — Explicit silent token renewal, not event-driven

**Status:** Accepted

## Decision

`automaticSilentRenew: false` in `UserManager`. Silent renewal is
handled explicitly inside `OidcAuthRepository.getCurrentSession()`.

## Rationale

Event-driven background renewal (`automaticSilentRenew: true`) fires
invisibly. When it fails, the application has no clean hook to force
logout — it only discovers the expired token on the next API call.
Explicit renewal gives the application full control: try renewal, clear
session on failure, return `null` so callers redirect to login.

## Consequences

- `getCurrentSession()` is the single choke point for renewal logic
- Session expiry is detected at the point of use (route check or page
  load), not proactively in the background
- Silent renewal latency is absorbed by the `ProtectedRoute` loading
  state rather than happening transparently in the background
