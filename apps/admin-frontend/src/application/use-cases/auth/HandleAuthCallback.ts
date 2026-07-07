import type { AuthRepository } from '../../repositories/AuthRepository'
import { toTenantContext, type TenantContext } from '../../context/TenantContext'

/**
 * Completes the redirect-based login flow once the identity provider has
 * sent the browser back to our callback route. Exchanges the callback URL
 * for a Session via the repository, then translates it into a
 * TenantContext for the rest of the application to use.
 *
 * Deliberately does not catch or wrap errors from the repository: at this
 * layer we don't yet know the full shape of failures oidc-client-ts can
 * produce (expired code, denied consent, network error), so swallowing or
 * re-wrapping them now would discard information presentation might need
 * later. This is a placeholder decision to revisit once the real
 * infrastructure implementation exists.
 */
export class HandleAuthCallback {
  private readonly authRepository: AuthRepository

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository
  }

  async execute(callbackUrl: string): Promise<TenantContext> {
    const session = await this.authRepository.handleCallback(callbackUrl)

    return toTenantContext(session.user)
  }
}
