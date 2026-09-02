# ADR 0037 — admin-frontend session core moves to `shared/session`; OIDC adapter stays in `features/auth`

Status: accepted (2026-09)

## Context

`features/categories/api/categoryRepository.ts` imported `@/app/servicesApi`,
inverting the `app → features → shared` dependency direction the architecture
enforces everywhere else (ARCHITECTURE.md §1).

This was a root-cause problem, not carelessness. `servicesApi` needs
credentials — `{ accessToken, tenantId }` — and those lived in `features/auth`'s
session store. `app/` was the only layer that could see both `shared/api` and
`features/auth`, so the composition
`createServicesFacade(createApiClient(getAuthCredentials))` had to sit in
`app/servicesApi.ts` — and the repository reached up to it to get a client.

The frontend previously listed a "port for OIDC" (an injected `authClient`
seam) as deliberately deferred: one integration, module-mock in tests is
enough. Fixing the inverted import turns that seam from a testing nicety into
load-bearing structure.

## Decision

Move the session **core** down into `shared/session/`:

- `session.ts` — session and `SessionPrincipal` types
- `sessionMachine.ts` — the pure reducer `reduceSession(event): AuthSnapshot`,
  now with **zero** `oidc-client-ts` reference, not even `import type`; it
  consumes a `SessionPrincipal` (`accessToken`, `expiresAt` in ms,
  `displayName`, `email`) that the adapter builds
- `sessionStore.ts` — snapshot / subscribe / `dispatch` / `getAuthCredentials`
  / the auth-event log (the log stays here because `shared/logger` is here)
- `tenant.ts` — decode the `tenant_id` claim from the access-token payload

`shared/api/servicesApi.ts` is the composition, now legitimately in `shared`
(it imports only `shared/*`). `app/servicesApi.ts` is deleted.

`features/auth/` keeps what is genuinely identity-provider-specific:

- `model/sessionDriver.ts` — subscribes to the `oidc-client-ts` `UserManager`
  events, maps `User → SessionPrincipal` (including the `expires_at` seconds →
  milliseconds conversion and translating an `expired` user to a null
  principal), dispatches into the shared store, and owns `startListening` /
  `login` / `logout` and the `isLoggingOut` race guard
- `api/authClient.ts` and the auth pages

ESLint enforces the direction from both sides now: `src/shared/**` may not
import `@/features/*` or `@/app/*`; `src/features/**` may not import `@/app/*`
(and still may not reach past a feature barrel).

### Why a claim decode belongs in `shared`, and is not business logic

`shared/` now carries a notion of "session" and "tenant". That is acceptable:

- Reading a field out of a JWT payload is **protocol handling**. `tenant.ts`
  runs `atob` + `JSON.parse` on the token's middle segment and reads one
  claim. It does not verify the signature (the backend does — ADR 0006), does
  not decide what a tenant may do, and encodes no rule. It is the same
  category of code as parsing a `Content-Type`.
- `shared/api/apiClient.ts` **already** failed closed without a session — its
  middleware threw `MissingSessionError` before this move. `shared` already
  had to answer "is there a session" to do its job; moving the store that
  answers it into `shared` removes an inversion, it does not add a concern.
- What stays out of `shared`: any knowledge that the session comes from OIDC.
  The reducer is a pure function of `SessionPrincipal`; only the driver in
  `features/auth` knows an `oidc-client-ts` `User` exists.

## Consequences

- `categoryRepository` imports `@/shared/api/servicesApi`; no feature reaches
  into `app/`. `app/` is composition-root-only again (providers, route table,
  layout, ErrorBoundary).
- A second identity provider would be a second driver in `features/auth`
  implementing the same `SessionPrincipal` contract — the core does not move.
- The pure reducer is tested with `SessionPrincipal` fixtures and no mocking;
  the driver's translation (including expired-user → unauthenticated, which
  left the reducer) is tested against a mocked `authClient`.
- The "categories repo imports `@/app/servicesApi` — known debt" line in
  ARCHITECTURE.md §5 is resolved by this ADR.
