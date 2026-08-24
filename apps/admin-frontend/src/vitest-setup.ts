import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Stub Aspire-injected env vars so tests don't trip shared/env.ts's fail-fast check.
vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:5080');
vi.stubEnv('VITE_OIDC_AUTHORITY', 'http://localhost:5081');
vi.stubEnv('VITE_OIDC_CLIENT_ID', 'admin-panel');
vi.stubEnv('VITE_OIDC_REDIRECT_URI', 'http://localhost:5173/callback');
vi.stubEnv('VITE_OIDC_POST_LOGOUT_REDIRECT_URI', 'http://localhost:5173/login');
vi.stubEnv('VITE_OIDC_SCOPE', 'openid profile tenant_id services-api offline_access');
