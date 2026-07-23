import type { AuthRepository } from '@/features/auth/application/repositories/AuthRepository'

/**
 * Logs the current user out. Kept as an explicit use case (rather than
 * calling authRepository.logout() directly from presentation) so that
 * any future cross-cutting logout behavior (e.g. clearing cached
 * tenant-scoped data elsewhere in the app) has a natural place to live
 * without restructuring callers.
 */
export class Logout {
  private readonly authRepository: AuthRepository

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository
  }

  async execute(): Promise<void> {
    await this.authRepository.logout()
  }
}
