# ADR 015 — Auth is throw-free end to end too

**Status:** Accepted

## Decision

`features/auth/` now follows the same Result convention docs/adr/014
established for Catalog - no throw for an expected outcome, no
try/catch as the primary error-handling mechanism in business or
presentation code:

- `Session.create()`/`User.create()`/`Tenant.create()` return
  `Result<T, InvalidXError>` instead of throwing.
- `mapOidcUserToSession` (`features/auth/infrastructure/`) composes them
  via early-return `Result` branching into
  `Result<Session, SessionMappingError>` - `SessionMappingError` is the
  union of `MissingTenantClaimError`, the new `MissingExpiryClaimError`,
  and the three domain validation errors above.
- `AuthRepository.initiateLogin`/`handleCallback`/`logout` return
  `Result<T, AuthFlowError>` instead of throwing. The `try/catch` around
  `oidc-client-ts`'s own throwing calls (`signinRedirect`,
  `signinRedirectCallback`, `signinSilent`) stays inside
  `OidcAuthRepository` - a contained infrastructure-adapter boundary, the
  same category docs/adr/014 already carved out for
  `AuthenticatedHttpClient`/`parseApiResponse.ts`.
- `AuthRepository.getCurrentSession` is unchanged:
  `Promise<Session | null>`, never a `Result`. It already never threw in
  the sense that mattered to callers - `null` already means "no usable
  session" whether that's no session, a failed renewal, or (now) a
  malformed cached user. Wrapping an always-successful call in `Result`
  would add a type parameter with no failure variant ever produced.
- `InitiateLogin`/`HandleAuthCallback`/`Logout` (use cases) mirror the
  repository's Result-returning methods. `GetCurrentSession` is
  unchanged for the same reason as above.
- `AuthProvider`'s `login`/`completeLogin`/`logout` callbacks return
  `Result` instead of throwing; `LoginPage`/`CallbackPage` branch on the
  `Result` directly instead of `try/catch`.

## Rationale

Converting `mapOidcUserToSession` surfaced a real gap the same way
`categoryMapper.ts` did during the Catalog pass: `getCurrentSession()`'s
cached-user path called it with **no try/catch at all** - only the
silent-renewal path had one. A cached user whose profile no longer maps
to a valid session (e.g. `tenant_id` claim dropped by a client
misconfiguration) would throw uncaught, land in `useAsync`'s
`initialError` state, and `AuthProvider`'s state derivation - which only
checked `loading` vs `tenantContext !== null` - would silently treat that
as `unauthenticated` and redirect to `/login`. Not a security hole (fails
closed, no cross-tenant leak), but a real bug: a genuine error was
indistinguishable from "never logged in." Fixed by giving
`getCurrentSession()` the same broad try/catch `renewSession()` already
had (extracted into a shared `clearAndReturnNull()` helper), so every
failure mode - missing user, malformed cached profile, storage read
failure, failed renewal, identity mismatch - now converges on the same
explicit, intentional "clear and require a full login" path instead of
some going through an accidental exception.

The silent-renewal identity check (user/tenant claims must not change
across a renewal, or the renewed token is discarded) is unchanged in
substance - only its surrounding control flow moved from throw-based to
Result-based.

## Consequences

- `agent-skills/agenza-frontend-feature` no longer describes Auth as an
  exception to Catalog's Result convention - both features follow the
  same shape now. Updated to say so.
- Test fixtures across the suite that build a `Tenant`/`User`/`Session`
  for a known-valid case (most of the suite touches auth in some way)
  import from a new `src/test/fixtures/authEntityFixtures.ts` instead of
  the real entities directly - it re-exports `{ create }` wrappers that
  unwrap the `Result`, so call sites read identically to before
  (`Tenant.create('tenant-123')`) without threading `unwrapResult(...)`
  through dozens of call sites. The entities' own `*.test.ts` files import
  the real classes directly, since they specifically assert on both the
  success and failure `Result` shapes.
- `AuthFlowErrorCode` gained `AUTH_LOGOUT_FAILED` (logout previously had
  no error handling at all - `userManager.removeUser()`/
  `signoutRedirect()` could throw uncaught).
- `AuthProvider`'s `logout` always clears local session state
  (`mutate(() => null)`) regardless of whether the returned `Result`
  succeeded - the local session is meaningfully gone once `removeUser()`
  succeeds even if ending the identity provider's own session afterward
  fails, and the app must never keep believing the user is still signed
  in.
