import { UserManager, WebStorageStateStore } from 'oidc-client-ts';
import { loadEnv } from '@/shared/env';

const env = loadEnv();

// oidc-client-ts uses standard OIDC discovery (`${authority}/.well-known/openid-configuration`)
// by default. If discovery ever proves unavailable against identity-service (OpenIddict), the
// fallback is to configure `metadata` explicitly here with the known endpoints
// (`${authority}/connect/authorize`, `/connect/token`, `/connect/userinfo`, `/connect/logout`,
// `/.well-known/jwks`) instead of relying on `authority` alone — see
// specs/001-oidc-shell-scaffold/research.md Decision 13.
export const authClient = new UserManager({
  authority: env.oidcAuthority,
  client_id: env.oidcClientId,
  redirect_uri: env.oidcRedirectUri,
  post_logout_redirect_uri: env.oidcPostLogoutRedirectUri,
  scope: env.oidcScope,
  response_type: 'code',
  // Shared across tabs (not the library's sessionStorage default) so a second tab recognizes
  // an existing session rather than forcing a redundant login — see plan.md's I1 remediation.
  userStore: new WebStorageStateStore({ store: window.localStorage }),
  automaticSilentRenew: true,
});
