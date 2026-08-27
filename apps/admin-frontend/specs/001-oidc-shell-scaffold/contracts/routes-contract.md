# Contract: Route Table

The full set of client-side routes this scaffold serves. Every route not explicitly listed as public falls through to the authenticated catch-all, which enforces the fail-closed guard (spec FR-001, FR-002, FR-009).

| Route | Access | Renders | Notes |
|---|---|---|---|
| `/login` | Public | `LoginPage` component (`presentation/pages/LoginPage/`): triggers the OIDC redirect to identity-service's `/connect/authorize` via its `useLoginRedirect` hook | Also the post-logout redirect target (`VITE_OIDC_POST_LOGOUT_REDIRECT_URI`). Does not itself render a form — identity-service owns the actual login UI (constitution: auth goes through identity-service). |
| `/callback` | Public (OIDC round-trip only) | `AuthCallbackPage` component (`presentation/pages/AuthCallbackPage/`): its `useAuthCallback` hook completes `oidc-client-ts`'s `signinCallback()`, then navigates to `/` | Fixed by `VITE_OIDC_REDIRECT_URI`; MUST exactly match the registered redirect URI in identity-service's `admin-panel` client registration. |
| `/` (and any other authenticated path) | Authenticated only, via `ProtectedRoute` | `AppLayout` (shell: layout + placeholder navigation, FR-004) | No business routes exist yet (FR-013) — this is the only authenticated destination in this scaffold. Unauthenticated visitors are redirected to `/login` (FR-002); an expired/renewal-failed session is treated identically (FR-009). |

**Contract rules**:
- `ProtectedRoute` is the single enforcement point for FR-001/FR-002/FR-009 — every future authenticated route (business features included) MUST be nested under it rather than re-implementing the guard, so the fail-closed invariant stays centralized.
- `/callback` and `/login` MUST remain public (no `ProtectedRoute` wrapper) — wrapping them would create a redirect loop.
- No route reads or writes a tenant identifier to/from the URL (spec FR-006; this scaffold has no tenant-scoped path segments like `/t/:tenantId/...`).
