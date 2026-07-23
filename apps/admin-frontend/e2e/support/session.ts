import type { Page } from '@playwright/test'

/**
 * Mirrors .env.local (see .env.example) - these must match the real
 * VITE_OIDC_AUTHORITY/VITE_OIDC_CLIENT_ID the dev server is started with,
 * since oidc-client-ts's WebStorageStateStore keys the cached user by both.
 */
const OIDC_AUTHORITY = 'http://localhost:5081'
const OIDC_CLIENT_ID = 'admin-panel'

export function oidcUserStorageKey(authority = OIDC_AUTHORITY, clientId = OIDC_CLIENT_ID): string {
  return `oidc.user:${authority}:${clientId}`
}

interface FakeSessionOptions {
  tenantId?: string
  userId?: string
  name?: string
  email?: string
  expiresInSeconds?: number
}

/**
 * Writes an oidc-client-ts User record straight into localStorage, in the
 * exact shape User.fromStorageString() expects (see node_modules/oidc-client-ts
 * User.toStorageString/fromStorageString - a flat JSON object matching the
 * constructor args, `profile` stored verbatim rather than decoded from
 * id_token). This lets a spec exercise the real AuthProvider/OidcAuthRepository/
 * ProtectedRoute/TenantBoundary wiring as "already signed in" without running
 * a real OIDC handshake against identity-service.
 *
 * Must be called before the first page.goto() in a test - addInitScript only
 * affects navigations that happen after it's registered.
 */
export async function injectAuthenticatedSession(
  page: Page,
  options: FakeSessionOptions = {},
): Promise<void> {
  const expiresInSeconds = options.expiresInSeconds ?? 3600
  const record = {
    session_state: null,
    access_token: 'e2e-fake-access-token',
    token_type: 'Bearer',
    scope: 'openid profile tenant_id services-api offline_access',
    profile: {
      sub: options.userId ?? 'e2e-user-1',
      tenant_id: options.tenantId ?? 'e2e-tenant-1',
      name: options.name ?? 'Usuária de Teste',
      email: options.email ?? 'teste@example.com',
    },
    expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
  }

  await page.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      window.localStorage.setItem(key, value)
    },
    { key: oidcUserStorageKey(), value: JSON.stringify(record) },
  )
}

/**
 * signoutRedirect() first fetches identity-service's OIDC discovery document
 * to resolve `end_session_endpoint`, then navigates the browser there; a
 * real end-session endpoint would in turn redirect back to
 * post_logout_redirect_uri. Both legs happen on the same origin, so one
 * route handler serves the discovery JSON for the well-known path and a 302
 * for everything else under that origin (the end-session navigation,
 * whatever its query string).
 */
export async function mockOidcSignout(page: Page, postLogoutRedirectUri: string): Promise<void> {
  const endSessionEndpoint = `${OIDC_AUTHORITY}/connect/endsession`

  await page.route(
    url => url.origin === OIDC_AUTHORITY,
    route => {
      const requestUrl = new URL(route.request().url())

      if (requestUrl.pathname.endsWith('/.well-known/openid-configuration')) {
        return route.fulfill({
          json: {
            issuer: OIDC_AUTHORITY,
            authorization_endpoint: `${OIDC_AUTHORITY}/connect/authorize`,
            token_endpoint: `${OIDC_AUTHORITY}/connect/token`,
            userinfo_endpoint: `${OIDC_AUTHORITY}/connect/userinfo`,
            jwks_uri: `${OIDC_AUTHORITY}/.well-known/openid-configuration/jwks`,
            end_session_endpoint: endSessionEndpoint,
          },
        })
      }

      return route.fulfill({ status: 302, headers: { location: postLogoutRedirectUri } })
    },
  )
}
