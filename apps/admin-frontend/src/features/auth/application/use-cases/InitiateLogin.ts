import type { AuthRepository } from '@/features/auth/application/repositories/AuthRepository'

/**
 * Begins the redirect-based login flow. The browser navigates away as a
 * side effect of authRepository.initiateLogin() - there is no meaningful
 * return value, since control leaves this application until the identity
 * provider redirects back to our callback route.
 */
export class InitiateLogin {
  private readonly authRepository: AuthRepository

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository
  }

  async execute(): Promise<void> {
    await this.authRepository.initiateLogin()
  }
}
