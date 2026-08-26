import { UserManager, WebStorageStateStore } from 'oidc-client-ts';
import { loadEnv } from '@/shared/env';

const env = loadEnv();

// If OIDC discovery ever fails, configure `metadata` explicitly instead (research.md Decision 13).
export const authClient = new UserManager({
  authority: env.oidcAuthority,
  client_id: env.oidcClientId,
  redirect_uri: env.oidcRedirectUri,
  post_logout_redirect_uri: env.oidcPostLogoutRedirectUri,
  scope: env.oidcScope,
  response_type: 'code',
  // localStorage, not the library's sessionStorage default, so a second tab reuses the session.
  userStore: new WebStorageStateStore({ store: window.localStorage }),
  automaticSilentRenew: true,
});
