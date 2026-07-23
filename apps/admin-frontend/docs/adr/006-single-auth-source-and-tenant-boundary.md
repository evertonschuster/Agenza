# ADR 006 — Single auth source of truth, session-invalidation port, tenant boundary

**Status:** Accepted

## Decision

Replace the per-call-site `useAuth()` (each call independently ran its own
`getCurrentSession()` via `useAsync`) with:

- `AuthProvider`, mounted once in `AppProviders`, as the single source of
  session state. `useAuth()` is now a pure `useContext` consumer with no
  state of its own.
- `SessionEventBus` (`application/ports/SessionEventBus.ts`), a framework-
  agnostic pub/sub port. `AuthenticatedHttpClient` publishes to it (no
  React import needed) on a 401 or a missing token; `AuthProvider`
  subscribes and clears the shared session via the same `useAsync.mutate`
  used for logout.
- `TenantBoundary`, wrapping the routed page content in `AdminLayout`.
  Keys its subtree on `${user.id}:${tenant.id}` (not tenant id alone), so a
  session/tenant identity change remounts every tenant-scoped component
  underneath — dialogs close, forms/filters/pagination reset, in-flight
  `useAsync` calls are abandoned — instead of any of that state surviving
  into the next session, even transiently.
- `useAsync` hardening: `execute()` now also captures the active `resetKey`
  at call start and refuses to commit if it no longer matches the current
  one, even when no _newer_ `execute()` call raced it (the case that
  ordering-only guarding via a request id cannot catch — e.g. a mutation's
  own background refetch, invoked from inside an async function, resolving
  after the app has already switched tenants). `mutate` accepts an optional
  `expectedGeneration` (captured via `captureGeneration()` before starting
  an async write) and no-ops if it's stale, so an optimistic insert from an
  abandoned tenant/session can't land in the current one either.

## Rationale

The previous `useAuth()` had two independent bugs given this app's
multi-tenant, session-can-change nature:

1. **No single source of truth.** `ProtectedRoute`, `AdminLayout`, and
   every list page each ran their own `getCurrentSession()` fetch and held
   independent `useState`. Nothing kept them in sync — a session change
   visible to one instance had no way to propagate to another.
2. **No 401 reaction.** `AuthenticatedHttpClient` already distinguished "no
   token"/401 as `UnauthenticatedError`, but nothing consumed that signal
   beyond the one call site that happened to catch it. Stale tenant-scoped
   UI could keep rendering after the session was, in fact, no longer valid.

Reusing `useAsync` inside `AuthProvider` (rather than inventing a new
state-management primitive) keeps the "no server-state library, no global
store" constraint from ADR 002/docs/DECISIONS.md — `useAsync`'s existing
out-of-order/unmount guarding, extended with the resetKey/generation
checks above, is sufficient once it's shared through one provider instead
of duplicated per hook call.

## Consequences

- Every `useAuth()` consumer must render under `AuthProvider` (wired in
  `AppProviders`, above `ThemeProvider`). Component tests that render a
  page/route directly with just `AppContainerContext.Provider` now also
  need `AuthProvider` in the tree, and their fake `AppContainer` needs a
  `sessionEvents` field (a fake bus is available at
  `src/test/fixtures/fakeSessionEventBus.ts`).
- `AppContainer` gained a `sessionEvents: SessionEventBus` field, backed by
  `InMemorySessionEventBus` in the real composition root.
  `AuthenticatedHttpClient`'s constructor takes it as an optional 4th
  parameter (defaults to a no-op) so tests that don't exercise
  invalidation don't need to pass one.
- A 401 clears the shared session (`status: 'unauthenticated'`,
  `tenantContext: null`) but does **not** call `authRepository.logout()` —
  it's a local-state invalidation, not a full OIDC end-session redirect.
  `ProtectedRoute` reacts to the resulting status and redirects to
  `/login`; the identity provider's own session is untouched (the user can
  silently re-authenticate if they still have one).
- `TenantBoundary` only wraps the routed content inside `AdminLayout`, not
  the layout shell itself — the sidebar/nav don't need to remount on a
  tenant switch, only the tenant-scoped pages underneath.
- This ADR does not yet address the composition-root/`AppContainer`
  reshaping (raw repositories/`httpClient` still exposed to presentation)
  — that's a separate, later decision.
