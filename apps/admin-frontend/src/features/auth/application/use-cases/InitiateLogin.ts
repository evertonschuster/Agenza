import type { AuthRepository } from '@/features/auth/application/repositories/AuthRepository'
import { resolvePostLoginPath } from '@/features/auth/application/navigation/postLoginPath'

export class InitiateLogin {
  private readonly authRepository: AuthRepository

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository
  }

  async execute(returnTo?: string): Promise<void> {
    await this.authRepository.initiateLogin(resolvePostLoginPath(returnTo))
  }
}
