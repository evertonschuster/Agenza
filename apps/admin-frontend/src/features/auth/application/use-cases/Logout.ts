import type { AuthRepository } from '@/features/auth/application/repositories/AuthRepository'
import type { AuthFlowError } from '@/features/auth/application/errors/AuthFlowError'
import type { Result } from '@/shared/application/Result'

export class Logout {
  private readonly authRepository: AuthRepository

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository
  }

  async execute(): Promise<Result<void, AuthFlowError>> {
    return this.authRepository.logout()
  }
}
