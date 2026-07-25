import type { AuthRepository } from '@/features/auth/application/repositories/AuthRepository'

export class InitiateLogin {
  private readonly authRepository: AuthRepository

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository
  }

  async execute(): Promise<void> {
    await this.authRepository.initiateLogin()
  }
}
