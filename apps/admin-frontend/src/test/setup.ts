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
