# ADR 0083 — admin-frontend: identity changes require a fresh login

Status: accepted (2026-10-26); extends [ADR 0037](0037-admin-frontend-session-core-in-shared.md), narrows
[ADR 0033](0033-admin-frontend-no-request-cancellation-layer.md) for the authenticated request lifetime

## Context

The tenant boundary on the server is correct, but `USER_LOADED` replaced credentials without comparing the
previous identity. A silent renewal could leave a person's form from one tenant mounted while requests use
another tenant. The owner approved correcting this and preserving ordinary renewal.

## Decision

- The OIDC adapter carries the subject from the validated OIDC profile. The session retains that subject;
  tenant continues through the existing access-token claim decoder. A missing subject or tenant fails closed.
- The pure reducer receives the previous snapshot. A different subject or tenant while authenticated clears
  credentials, user and tenant before the new credentials become available, and latches `identity_changed`.
  Only explicit `LOGIN_STARTED` releases it; cleanup events and late responses cannot authenticate it again.
- The store aborts its outgoing request scope when authentication ends. The existing API middleware joins
  that signal with the caller's signal. Normal renewal retains the scope; a fresh login receives a fresh one.
  This is session cancellation, without a request registry or per-feature identity cache keys.
- `ProtectedRoute` unmounts protected content and shows “Sua sessão mudou.” / “Entre novamente para continuar.”
  with “Entrar novamente”. The OIDC adapter stops silent renewal and removes its locally stored user.
  Explicit login waits for that removal and uses `prompt=login`. A cleanup failure is logged without personal
  data; the in-memory session remains blocked.
- The adapter ignores an initial `getUser()` after a newer user event, after listener disposal or while
  leaving the session. This prevents startup, renewal and sign-out races from replacing newer state.

## Consequences

Server authorization, token validation and the HTTP contract stay as they are. The browser does not establish
authorization by decoding a token. Cancellation prevents consumption of an old response; it cannot roll back
a write already processed by the server. The current protected feature state lives under `ProtectedRoute`
and is discarded when it unmounts; a future external cache must follow the same session lifetime.

Regression tests cover the same identity with a renewed token, subject and tenant changes, absent identity,
late events, request cancellation, protected form removal and explicit login. Specification and run guide:
[`007-session-identity-guard`](../../apps/admin-frontend/specs/007-session-identity-guard/spec.md).

## Alternatives rejected

- Re-fetching only the current page leaves other loaded state and mutations associated with the old identity.
- Switching tenant on every page duplicates a security lifecycle across features.
- Clearing storage alone leaves live credentials and mounted data until a reload.
- A global request registry or request-per-tenant cache is unnecessary: one signal represents the session.

## Review follow-up (2026-10-26)

The first implementation compared identities only when both snapshots were authenticated. A renewal without
subject or tenant discarded the accepted identity, allowing a later valid user event to authenticate again.
The comparison now also rejects disappearance of either claim from an authenticated session, using the existing
`identity_changed` latch, credential cleanup and explicit login flow. Initial authentication still reports the
specific missing-claim failure. Regression tests cover missing claims followed by late events and a fresh login.
