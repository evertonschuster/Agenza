import { defineConfig, devices } from '@playwright/test'

const e2eEnvironment = {
  VITE_OIDC_AUTHORITY: process.env.VITE_OIDC_AUTHORITY ?? 'http://localhost:5081',
  VITE_OIDC_CLIENT_ID: process.env.VITE_OIDC_CLIENT_ID ?? 'admin-panel',
  VITE_OIDC_REDIRECT_URI: process.env.VITE_OIDC_REDIRECT_URI ?? 'http://localhost:4173/callback',
  VITE_OIDC_POST_LOGOUT_REDIRECT_URI:
    process.env.VITE_OIDC_POST_LOGOUT_REDIRECT_URI ?? 'http://localhost:4173/login',
  VITE_OIDC_SCOPE:
    process.env.VITE_OIDC_SCOPE ?? 'openid profile tenant_id services-api offline_access',
  VITE_API_BASE_URL: process.env.VITE_API_BASE_URL ?? 'http://localhost:5080',
}

/**
 * Every spec here mocks its own backend calls via page.route() and injects
 * an oidc-client-ts session directly into localStorage where it needs one -
 * no identity-service/services-service/Postgres needs to be running. That
 * keeps this suite fast and deterministic, and runnable in any environment
 * (including CI) without Docker.
 *
 * Runs against the production build (`vite build` + `vite preview`), not
 * `vite dev`: several specs count exactly how many times a mocked endpoint
 * is hit, and React's StrictMode double-invokes effects in development only
 * (see main.tsx) - that would fire every data-fetching effect twice and
 * make request counts nondeterministic. The production bundle matches what
 * actually ships and has no such double-invoke.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    env: e2eEnvironment,
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
