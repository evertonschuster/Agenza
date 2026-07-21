import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from './mocks/server'

// jsdom doesn't implement matchMedia - ThemeProvider needs it to read the
// OS color-scheme preference on mount.
window.matchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
})) as typeof window.matchMedia

// jsdom doesn't implement these either - Radix Select calls them while
// opening/closing its popup, needed for tests that click through it. The
// DOM lib types claim these always exist, which is only true in a real
// browser, not jsdom - disabling the rules built on that assumption below.
/* eslint-disable @typescript-eslint/no-unnecessary-condition, @typescript-eslint/unbound-method, @typescript-eslint/no-empty-function */
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.setPointerCapture ??= () => {}
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}
/* eslint-enable @typescript-eslint/no-unnecessary-condition, @typescript-eslint/unbound-method, @typescript-eslint/no-empty-function */

// Ensures each test starts with a clean DOM, preventing leakage between
// component tests (a common source of flaky, order-dependent test suites).
afterEach(() => {
  cleanup()
})

// MSW intercepts at the network level, so infrastructure-layer repository
// tests exercise real fetch/URL/header logic against a fake server instead
// of mocking the repository itself. onUnhandledRequest: 'error' ensures any
// HTTP call we forgot to mock fails loudly rather than silently hitting the
// real network or returning undefined.
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})
