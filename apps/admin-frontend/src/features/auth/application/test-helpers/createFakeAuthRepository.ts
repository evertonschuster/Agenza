import type { AuthRepository } from '@/features/auth/application/repositories/AuthRepository'
import { AuthFlowError } from '@/features/auth/application/errors/AuthFlowError'
import { failure, success } from '@/shared/application/Result'

const NOT_IMPLEMENTED = new AuthFlowError({
  code: 'unexpected',
  flowCode: 'AUTH_LOGIN_FAILED',
  message: 'not implemented in this fake',
  retryable: false,
})

export function createFakeAuthRepository(overrides: Partial<AuthRepository> = {}): AuthRepository {
  return {
    initiateLogin: () => Promise.resolve(success(undefined)),
    handleCallback: () => Promise.resolve(failure(NOT_IMPLEMENTED)),
    getCurrentSession: () => Promise.resolve(null),
    logout: () => Promise.resolve(success(undefined)),
    ...overrides,
  }
}
