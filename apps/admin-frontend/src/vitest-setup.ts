import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// A running app always has these injected by Aspire (contracts/env-contract.md) — stub
// realistic values globally so individual tests don't each need to work around
// shared/env.ts's fail-fast check, which exists for catching a genuine deployment
// misconfiguration, not for component tests unrelated to env loading.
vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:5080');
vi.stubEnv('VITE_OIDC_AUTHORITY', 'http://localhost:5081');
vi.stubEnv('VITE_OIDC_CLIENT_ID', 'admin-panel');
vi.stubEnv('VITE_OIDC_REDIRECT_URI', 'http://localhost:5173/callback');
vi.stubEnv('VITE_OIDC_POST_LOGOUT_REDIRECT_URI', 'http://localhost:5173/login');
vi.stubEnv('VITE_OIDC_SCOPE', 'openid profile tenant_id services-api offline_access');
