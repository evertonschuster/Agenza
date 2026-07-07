import { UserManager, WebStorageStateStore } from 'oidc-client-ts'

/**
 * Builds the oidc-client-ts UserManager from environment configuration.
 * All UserManagerSettings live here and nowhere else, so changing how we
 * configure OIDC (e.g. switching storage, adding extraQueryParams for a
 * future IdentityServer requirement) never requires touching
 * OidcAuthRepository itself.
 *
 * automaticSilentRenew is disabled deliberately: our product decision is
 * to attempt silent renewal explicitly inside
 * OidcAuthRepository.getCurrentSession() and clear the session on
 * failure, rather than relying on event-driven background renewal that
 * the rest of the app has no visibility into.
 */
export function createUserManager(): UserManager {
  return new UserManager({
    authority: import.meta.env.VITE_OIDC_AUTHORITY,
    client_id: import.meta.env.VITE_OIDC_CLIENT_ID,
    redirect_uri: import.meta.env.VITE_OIDC_REDIRECT_URI,
    post_logout_redirect_uri: import.meta.env.VITE_OIDC_POST_LOGOUT_REDIRECT_URI,
    scope: import.meta.env.VITE_OIDC_SCOPE,
    automaticSilentRenew: false,
    userStore: new WebStorageStateStore({ store: window.localStorage }),
  })
}
