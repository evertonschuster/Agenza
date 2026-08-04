# ADR 007 — AppError taxonomy and idempotent OIDC callback

**Status:** Accepted; Result propagation is extended by ADRs 014 and 015.

## AppError boundary

- Presentation depends only on `AppError`, never raw fetch/OIDC/provider
  exceptions or free-text Problem Details messages.
- Stable codes cover validation, conflict, not-found, unauthenticated,
  unauthorized, network, timeout, and unexpected failures.
- Structured backend field errors may be retained for curated form mapping.
- `AuthenticatedHttpClient` is the one HTTP technical conversion boundary.
- Auth infrastructure maps provider failures to stable auth-flow errors before
  presentation.

## OIDC callback

- Callback completion is idempotent for React development behavior and repeated
  rendering: one callback URL is processed once at a time and repeated attempts
  reuse the same result rather than consuming OIDC state twice.
- Unsafe/missing return state falls back to the default internal destination.
- Successful callback state is committed through `AuthProvider`; failures show
  a curated recovery path without exposing provider details.

## Consequences

UI behavior is stable across infrastructure providers, and callback retries do
not create duplicate token/state consumption or raw technical messages.
