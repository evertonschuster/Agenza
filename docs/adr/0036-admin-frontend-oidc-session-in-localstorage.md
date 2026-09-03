# ADR 0036 — admin-frontend stores the OIDC session in `localStorage`

Status: accepted (2026-09)

## Context

`oidc-client-ts`'s `UserManager` needs somewhere to persist the authenticated
user — access token, expiry, profile. Its default store is `sessionStorage`,
which is scoped to a single tab.

`features/auth/api/authClient.ts` overrides this:
`userStore: new WebStorageStateStore({ store: window.localStorage })`.

## Decision

The OIDC user is persisted in `window.localStorage`, not `sessionStorage`.

- **Why:** a second browser tab reuses the existing session instead of
  bouncing the user through another provider redirect.
- **Accepted threat:** an XSS on our own origin can read the access token out
  of `localStorage`. `sessionStorage` is not meaningfully safer against this —
  same-origin script reads either — so the multi-tab benefit is close to free
  against this particular threat.
- **Rejected alternative:** access token in memory only, refresh token in an
  `httpOnly`, `SameSite` cookie. This is the stronger posture, but it needs a
  backend change: identity-service would have to issue and rotate a refresh
  cookie scoped to the SPA, and the app would need a silent-refresh-via-cookie
  path. Not worth it for the current threat model and team size; recorded here
  as the known upgrade if that calculus changes.
- **Mitigations in force:**
  - short access-token TTL plus automatic silent renewal
    (`automaticSilentRenew: true`), so a leaked token has a small useful
    window;
  - the `X-Tenant-Id` header is a routing convenience, not a trust boundary —
    the backend validates it against the JWT's own `tenant_id` claim
    ([ADR 0006](0006-tenant-header-base-entity-generic-repository.md)), so a
    stolen token cannot be replayed against another tenant by swapping a
    header;
  - `shared/api/apiClient.ts` fails closed — it throws `MissingSessionError`
    rather than send a request with no token or tenant.

## Consequences

- Opening the admin panel in a second tab "just works" with no redirect.
- The XSS blast radius includes the access token; the defence is the general
  no-XSS posture (owned component source, no `dangerouslySetInnerHTML`, CSP
  where the host allows it) together with the short token TTL.
- Moving to the in-memory-token + `httpOnly`-cookie model later is a
  backend-coordinated change; this ADR is the standing record that it is the
  considered alternative, not an oversight.
