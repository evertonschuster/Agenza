/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * The IdentityServer issuer URL (e.g. https://identity.example.com).
   * Placeholder until the backend is deployed - see .env.example.
   */
  readonly VITE_OIDC_AUTHORITY: string
  /** The client_id registered for this admin app in IdentityServer. */
  readonly VITE_OIDC_CLIENT_ID: string
  /** Must exactly match a redirect URI registered in IdentityServer. */
  readonly VITE_OIDC_REDIRECT_URI: string
  /** Must exactly match a post-logout redirect URI registered in IdentityServer. */
  readonly VITE_OIDC_POST_LOGOUT_REDIRECT_URI: string
  /** Space-separated OAuth scopes, e.g. "openid profile tenant_id". */
  readonly VITE_OIDC_SCOPE: string
  /** Base URL for backend microservice REST calls, e.g. http://localhost:5080. */
  readonly VITE_API_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
