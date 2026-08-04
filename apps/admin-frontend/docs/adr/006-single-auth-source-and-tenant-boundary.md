# ADR 006 — Single auth source and tenant UI boundary

**Status:** Accepted.

## Decision

- `AuthProvider`, mounted once, is the only frontend source of authenticated
  session and `TenantContext` state.
- `useAuth()` is a context consumer; it does not independently load sessions.
- Login callback completion commits validated user/tenant state before entering
  protected content.
- `ProtectedRoute` preserves only a validated internal return path and never
  redirects to an external or auth-entry URL from untrusted state.
- `TenantBoundary` wraps routed tenant-owned content and remounts/clears it when
  the authenticated tenant changes.
- A session invalidation event from the HTTP boundary clears auth state on
  missing/expired credentials.
- Silent renewal must preserve both user and tenant claims. A changed identity
  forces reauthentication.

## Consequences

Components cannot observe independent, conflicting session snapshots. Tenant
switches clear previous-tenant presentation state before new content renders.
