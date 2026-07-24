import type { AuthRepository } from '@/features/auth/application/repositories/AuthRepository'

/**
 * Builds a fake AuthRepository for use case unit tests. Defaults to
 * "nothing is logged in / nothing happens" behavior for every method;
 * pass overrides to control what a specific test needs to verify.
 *
 * This is a hand-written interface fake, not a mocking-library mock or an
 * MSW handler - use case tests exercise pure orchestration logic against
 * the AuthRepository contract, with no HTTP, no DOM, and no OIDC library
 * involved.
 */
export function createFakeAuthRepository(overrides: Partial<AuthRepository> = {}): AuthRepository {
  return {
    initiateLogin: () => Promise.resolve(),
    handleCallback: () => Promise.reject(new Error('not implemented in this fake')),
    getCurrentSession: () => Promise.resolve(null),
    logout: () => Promise.resolve(),
    ...overrides,
  }
}
