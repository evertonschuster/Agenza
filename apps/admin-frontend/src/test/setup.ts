import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from './mocks/server'

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
