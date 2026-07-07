# Project Decisions Log

Decisions made during the initial build that agents should not relitigate
without explicit instruction from the project owner. Each entry has a
reason — if the reason no longer applies, the decision can be revisited.

---

## TypeScript configuration

### `erasableSyntaxOnly: true`

**Decision:** Keep the Vite 8 default.
**Reason:** Forces all classes to use explicit field declarations instead
of constructor parameter shorthand. This is more verbose but more
explicit — aligns with Clean Code principles. Applies project-wide
including use cases, repositories, and test helpers.
**Impact:** Every class constructor must declare fields explicitly and
assign in the body. No `constructor(private readonly x: T) {}`.

### `exactOptionalPropertyTypes: true`

**Decision:** Keep it despite the extra friction.
**Reason:** The domain models auth session data and tenant context where
"field absent" and "field explicitly undefined" are meaningfully different
states. Caught real bugs during the Auth build (Session optional fields,
User email/name assignment).
**Impact:** Optional field assignment requires conditional pattern:
`if (value !== undefined) { this.field = value }`. Never assign
`this.field = maybeUndefined` directly.

### `noUncheckedIndexedAccess: true`

**Decision:** Keep it.
**Reason:** Direct motivation: `oidcUser.profile['tenant_id']` resolves
to `unknown`, not `string`. The runtime guard `typeof x === 'string'` is
the only thing that's safe here — the compiler confirms this is necessary.

---

## Authentication

### OIDC library: `oidc-client-ts`

**Decision:** Use `oidc-client-ts` as the infrastructure-layer OIDC adapter.
**Reason:** Framework-agnostic (not React-specific), maintained standard
for Auth Code + PKCE flows, full TypeScript types.

### `automaticSilentRenew: false`

**Decision:** Disabled. Silent renewal is handled explicitly inside
`OidcAuthRepository.getCurrentSession()`.
**Reason:** Event-driven background renewal is invisible to callers —
they can't observe failure, can't trigger logout on failure, and can't
control timing. Explicit renewal inside `getCurrentSession()` gives the
application full control: try renewal, clear session on failure, return
`null` so callers redirect to login.

### `HandleAuthCallback` propagates errors unwrapped

**Decision:** `HandleAuthCallback.execute()` does not catch or wrap
errors from `authRepository.handleCallback()`.
**Reason:** At build time, the exact error shapes from `oidc-client-ts`
on various failure modes (expired code, denied consent, network error)
were unknown. Wrapping prematurely would discard information the
presentation layer might need to show different messages.
**Revisit when:** The IdentityServer backend exists and real error shapes
can be observed. At that point, consider a typed `AuthCallbackError`.

### `tenant_id` claim name

**Decision:** Use `tenant_id` as the claim name in IdentityServer tokens.
**Location:** Only referenced in `src/infrastructure/mappers/oidcUserToSessionMapper.ts`.
**Revisit when:** A real token can be decoded and the actual claim name confirmed.

### `email` and `name` on `User` entity

**Decision:** Included as optional fields, marked as unverified assumptions.
**Reason:** Standard OIDC claims likely present, but actual IdentityServer
configuration not yet confirmed.
**Revisit when:** A real token is available — these may not exist, may be
named differently, or may require specific scopes.

---

## Application layer

### No server-state library (no TanStack Query, no SWR)

**Decision:** Use plain `useAsync` hook + repository calls.
**Reason:** Explicit project constraint from the brief. Most "state" here
is server data scoped by tenant — no complex shared client state.
`useAsync` provides the consistent loading/data/error pattern across all
feature hooks without the overhead of a full library.

### `useAsync` with `immediate` flag

**Decision:** `useAsync` accepts `{ immediate: boolean }` and defaults
to `true` (auto-run on mount).
**Reason:** Most uses are "fetch on mount and show the result." The
`immediate: false` option covers action-style calls (e.g. mutations)
that should only run on explicit user interaction.

### `react-hooks/set-state-in-effect` suppression in `useAsync`

**Decision:** The `void execute()` call inside `useEffect` is suppressed
with an eslint-disable comment.
**Reason:** This is a documented false positive. The rule traces async
call graphs and flags setState calls that happen after `await` — but
those calls are genuinely async and not synchronous within the effect.
React's own docs show the same pattern as recommended. See open issue
react/react#34743.
**Do not remove:** If this lint error appears elsewhere in the codebase,
treat it as a real violation.

---

## Infrastructure

### MSW `onUnhandledRequest: 'error'`

**Decision:** Any unhandled HTTP request in tests fails loudly.
**Reason:** Silent failures (hanging promises, undefined returns) are
worse than loud ones. If a repository makes a call without a registered
handler, we want to know immediately, not debug a flaky timeout.

### No real network calls in tests — ever

**Decision:** `oidc-client-ts`'s `UserManager` is mocked with a
hand-written fake in infrastructure tests, not with MSW (MSW intercepts
`fetch`, but `UserManager` does its own internal fetch management).
**Pattern:** Infrastructure tests for `OidcAuthRepository` use
`createFakeUserManager()` with `vi.fn()` methods.

---

## Presentation

### Context-based DI (not module-level singletons)

**Decision:** The `AppContainer` is built once via `useState(() => createAppContainer())`
in `AppProviders` and distributed via React context.
**Reason:** Singleton modules make testing harder (shared state between
tests). Context-based DI means each test can provide its own fake
container without module-level mocking.

### `ProtectedRoute` handles loading state explicitly

**Decision:** While `useAuth` status is `'loading'`, `ProtectedRoute`
renders a spinner — it does not redirect to `/login`.
**Reason:** Prevents a race condition where an authenticated user gets
briefly redirected to login before `getCurrentSession()` resolves.

### Design language

Slate gray primary (`#1e293b`), white surfaces, teal accent (`#0d9488`).
Calm, professional, trustworthy — appropriate for healthcare/wellness
business owners. Not startup-flashy.
