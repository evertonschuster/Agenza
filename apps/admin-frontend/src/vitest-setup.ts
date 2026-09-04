import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Keep FR-015's logAuthEvent calls (sessionStore) out of the test console without dropping them.
vi.mock('@/shared/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Node 26 defines a native `localStorage` global that stays disabled without --localstorage-file,
// and jsdom defers to it — so both window.localStorage and globalThis.localStorage are undefined.
if (typeof window.localStorage === 'undefined') {
  const entries = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return entries.size;
    },
    key: (index: number) => [...entries.keys()][index] ?? null,
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, String(value));
    },
    removeItem: (key: string) => {
      entries.delete(key);
    },
    clear: () => {
      entries.clear();
    },
  };
  Object.defineProperty(window, 'localStorage', { value: storage, configurable: true });
}

// jsdom ships no matchMedia; without this every consumer sees `undefined` instead of a query.
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });
}

// Stub Aspire-injected env vars so tests don't trip shared/env.ts's fail-fast check.
vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:5080');
vi.stubEnv('VITE_OIDC_AUTHORITY', 'http://localhost:5081');
vi.stubEnv('VITE_OIDC_CLIENT_ID', 'admin-panel');
vi.stubEnv('VITE_OIDC_REDIRECT_URI', 'http://localhost:5173/callback');
vi.stubEnv('VITE_OIDC_POST_LOGOUT_REDIRECT_URI', 'http://localhost:5173/login');
vi.stubEnv('VITE_OIDC_SCOPE', 'openid profile tenant_id services-api offline_access');
