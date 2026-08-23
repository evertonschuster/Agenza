# Contract: Aspire → admin-frontend Environment Variables

This is the integration boundary between `backend/AppHost/AppHost.cs` (already wired, not something this feature changes) and the admin-frontend app. All values below are injected by Aspire's `AddViteApp("admin-frontend", ...)` resource and MUST be read via `import.meta.env` (Vite's required `VITE_`-prefixed convention) — never hardcoded, since several are dynamically resolved via Aspire service discovery.

| Variable | Source (AppHost) | Consumed by | Notes |
|---|---|---|---|
| `VITE_API_BASE_URL` | `servicesService.GetEndpoint("http")` (dynamic) | `shared/api/apiClient.ts` | Base URL for the generated `services-service` client (Decision 6). Resolves to `http://localhost:5080` in local dev but MUST be read from env, not assumed. |
| `VITE_OIDC_AUTHORITY` | `identityService.GetEndpoint("http")` (dynamic) | `features/auth/authClient.ts` | OIDC authority passed to `oidc-client-ts`'s `UserManagerSettings.authority`. Resolves to `http://localhost:5081`. |
| `VITE_OIDC_CLIENT_ID` | Static: `"admin-panel"` | `features/auth/authClient.ts` | Matches the OIDC client registered in `identity-service`'s `DatabaseSeeder.cs` (public client, PKCE required, pre-approved/no consent screen). There is no other client id to use. |
| `VITE_OIDC_REDIRECT_URI` | Static: `"http://localhost:5173/callback"` | `features/auth/authClient.ts` | MUST match a route this app actually serves (`routes-contract.md`) and a registered redirect URI for `admin-panel`. |
| `VITE_OIDC_POST_LOGOUT_REDIRECT_URI` | Static: `"http://localhost:5173/login"` | `features/auth/authClient.ts` | Same constraint as above, for RP-initiated logout (spec FR-008, Assumptions). |
| `VITE_OIDC_SCOPE` | Static: `"openid profile tenant_id services-api offline_access"` | `features/auth/authClient.ts` | The `tenant_id` scope is what routes the `tenant_id` claim onto the access token (see identity-service's `AuthorizationController.GetDestinations`) — omitting it would silently break tenant resolution. `offline_access` is what makes silent renewal (FR-007) possible via refresh tokens. |

**Contract rules**:
- This app MUST NOT hardcode `localhost:5081`/`localhost:5080` as fallback defaults for the dynamic variables — Aspire may resolve different addresses in non-default configurations, and hardcoding would silently reintroduce the "trusted from client" failure mode the constitution forbids for tenant data (even though these two are URLs, not tenant ids, treating any Aspire-injected value as optional/overridable defeats the point of service discovery).
- If any of these six variables is absent at startup (e.g., running `vite dev` standalone without Aspire), the app should fail fast with a clear startup error rather than silently falling back to guessed values — this is a local-dev-experience concern, not a security one, but prevents confusing failures.
- This contract only documents consumption. Changing any of these values is a change to `backend/AppHost/AppHost.cs`, outside this feature's scope.
