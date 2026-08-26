export interface AppEnv {
  apiBaseUrl: string;
  oidcAuthority: string;
  oidcClientId: string;
  oidcRedirectUri: string;
  oidcPostLogoutRedirectUri: string;
  oidcScope: string;
}

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. This app expects to be started ` +
        `through the Aspire AppHost (backend/AppHost), which injects it automatically — ` +
        `see specs/001-oidc-shell-scaffold/contracts/env-contract.md.`,
    );
  }
  return value;
}

export function loadEnv(): AppEnv {
  return {
    apiBaseUrl: required('VITE_API_BASE_URL', import.meta.env.VITE_API_BASE_URL),
    oidcAuthority: required('VITE_OIDC_AUTHORITY', import.meta.env.VITE_OIDC_AUTHORITY),
    oidcClientId: required('VITE_OIDC_CLIENT_ID', import.meta.env.VITE_OIDC_CLIENT_ID),
    oidcRedirectUri: required('VITE_OIDC_REDIRECT_URI', import.meta.env.VITE_OIDC_REDIRECT_URI),
    oidcPostLogoutRedirectUri: required(
      'VITE_OIDC_POST_LOGOUT_REDIRECT_URI',
      import.meta.env.VITE_OIDC_POST_LOGOUT_REDIRECT_URI,
    ),
    oidcScope: required('VITE_OIDC_SCOPE', import.meta.env.VITE_OIDC_SCOPE),
  };
}
