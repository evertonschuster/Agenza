# ADR 0020 — Automatic login transition and actionable authentication feedback

**Status:** Accepted

## Context

The authentication journey crossed two applications: the React admin
frontend and identity-service's credential page. The frontend required a
redundant click before opening the identity provider, while failures on both
sides collapsed into generic messages. A user could not tell whether a
request was still redirecting, had expired, was cancelled, had a connectivity
problem, or needed account action.

Silent renewal also accepted any successfully refreshed OIDC user. If the
renewed token changed `sub` or `tenant_id`, an HTTP request could use the new
identity while React still held tenant-scoped state for the previous one.

## Decision

- React's `/login` route is an automatic OIDC transition. It waits for the
  shared session check, starts one provider redirect when unauthenticated,
  and sends an authenticated user directly to the validated return path.
- React sends its current `light` or `dark` theme as an OIDC extension
  parameter. The identity-service accepts only those two values, applies the
  requested theme before loading the login stylesheet, and offers an
  accessible theme toggle. A selection made on the credential page is
  persisted on that origin and takes precedence on later visits; otherwise,
  the valid frontend request and then the operating-system preference are
  used.
- Login start and callback states explain what is happening and that the
  previous internal page will be restored after confirmation.
- OIDC adapter failures leave infrastructure as `AuthFlowError`, with a
  stable `AUTH_*` code, curated pt-BR explanation, and recovery action.
  Provider descriptions and exception messages are not rendered.
- The identity-service credential page distinguishes invalid credentials,
  temporary lockout, account not allowed, and two-factor required. Invalid
  e-mail and invalid password deliberately share one outcome to avoid account
  enumeration.
- Failure screens tell the user to include the stable code and attempt time
  when requesting help and explicitly warn them not to share a password.
  A generic “contacte o administrador” message is not sufficient.
- Silent renewal may update credentials and expiry only. A changed user or
  tenant claim clears the local OIDC session and requires a full login before
  another authenticated request is allowed.

## Consequences

- The normal journey has no intermediate confirmation screen:
  protected route → identity provider → callback → original route.
- The transition between the React application and the credential page
  preserves visual context without flashing the opposite theme. Direct
  visits to the identity page still have a deterministic theme fallback.
- Users receive a concrete next step and diagnostic reference without seeing
  sensitive technical details.
- A token for a different identity cannot be paired, even transiently, with
  the previous React tenant context.
- Known mappings, redirect idempotency, return-path restoration, theme
  transport, and renewed identity invariants have regression tests. Whether
  prose is sufficiently actionable and the theme transition is visually
  continuous are semantic rather than mechanically detectable, so no static
  architecture guard was added; the applicable automated and browser tests
  already run in the frontend quality commands.

## Related decisions

- `apps/admin-frontend/docs/adr/004-explicit-silent-renewal.md`
- `apps/admin-frontend/docs/adr/006-single-auth-source-and-tenant-boundary.md`
- `apps/admin-frontend/docs/adr/007-error-taxonomy-and-idempotent-callback.md`
