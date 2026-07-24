import type { AuthRepository } from '@/features/auth/application/repositories/AuthRepository'

export function createFakeAuthRepository(overrides: Partial<AuthRepository> = {}): AuthRepository {
  return {
    initiateLogin: () => Promise.resolve(),
    handleCallback: () => Promise.reject(new Error('not implemented in this fake')),
    getCurrentSession: () => Promise.resolve(null),
    logout: () => Promise.resolve(),
    ...overrides,
  }
}
