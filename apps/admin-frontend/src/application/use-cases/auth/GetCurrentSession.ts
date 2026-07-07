import type { AuthRepository } from '../../repositories/AuthRepository'
import { toTenantContext, type TenantContext } from '../../context/TenantContext'

/**
 * Reads the current authenticated session, if any. Delegates the actual
 * silent-renewal-then-clear-on-failure logic to the AuthRepository
 * implementation - this use case only translates the result into the
 * shape the rest of the application works with (TenantContext).
 */
export class GetCurrentSession {
  private readonly authRepository: AuthRepository

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository
  }

  async execute(): Promise<TenantContext | null> {
    const session = await this.authRepository.getCurrentSession()

    if (session === null) {
      return null
    }

    return toTenantContext(session.user)
  }
}
