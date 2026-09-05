import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

declare global {
  // Declared by @base-ui/react/global.d.ts too, but that subpath isn't resolvable through a
  // triple-slash reference — restated here for the one place that sets it.
  var BASE_UI_ANIMATIONS_DISABLED: boolean;
}

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

// jsdom has no ResizeObserver; Base UI's Popup/Positioner (Dialog, Menu, Tooltip...) needs one to
// compute anchor position and silently never opens without it.
if (typeof window.ResizeObserver === 'undefined') {
  window.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}

// jsdom has no pointer-capture implementation; Base UI's press handling calls these unconditionally.
if (typeof window.Element.prototype.hasPointerCapture === 'undefined') {
  window.Element.prototype.hasPointerCapture = () => false;
  window.Element.prototype.setPointerCapture = () => {};
  window.Element.prototype.releasePointerCapture = () => {};
}

// Base UI's useAnimationsFinished explicitly falls back to closing/opening instantly when
// getAnimations is absent (as it genuinely is in jsdom) — do NOT polyfill getAnimations here, or
// Base UI takes the Promise.all(animation.finished) path instead, which never settles without a
// real CSS engine and leaves overlays stuck mid-transition.
globalThis.BASE_UI_ANIMATIONS_DISABLED = true;

// Stub Aspire-injected env vars so tests don't trip shared/env.ts's fail-fast check.
vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:5080');
vi.stubEnv('VITE_OIDC_AUTHORITY', 'http://localhost:5081');
vi.stubEnv('VITE_OIDC_CLIENT_ID', 'admin-panel');
vi.stubEnv('VITE_OIDC_REDIRECT_URI', 'http://localhost:5173/callback');
vi.stubEnv('VITE_OIDC_POST_LOGOUT_REDIRECT_URI', 'http://localhost:5173/login');
vi.stubEnv('VITE_OIDC_SCOPE', 'openid profile tenant_id services-api offline_access');
