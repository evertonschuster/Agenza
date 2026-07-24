import { UserManager, WebStorageStateStore } from 'oidc-client-ts'

// automaticSilentRenew is off on purpose: OidcAuthRepository.getCurrentSession()
// drives renewal explicitly instead of relying on background events.
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
