import type { AuthRepository } from '../../repositories/AuthRepository'
import { toTenantContext, type TenantContext } from '../../context/TenantContext'

interface CachedCallback {
  url: string
  promise: Promise<TenantContext>
}

/**
 * Completes the redirect-based login flow once the identity provider has
 * sent the browser back to our callback route. Exchanges the callback URL
 * for a Session via the repository, then translates it into a
 * TenantContext for the rest of the application to use.
 *
 * Single-flight and idempotent per callback URL: this instance lives for
 * the app's lifetime (built once by the composition root), so caching the
 * in-flight/settled promise here - not in the calling component - survives
 * React.StrictMode's double effect invoke (and any other duplicate call
 * with the same URL) without a second, real exchange. That matters because
 * the authorization code in the URL is single-use - a second real call
 * with oidc-client-ts would fail on the identity provider's side, not just
 * waste a request. A different callback URL (a fresh login) always starts
 * a new exchange.
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
  private cached: CachedCallback | null = null

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository
  }

  async execute(callbackUrl: string): Promise<TenantContext> {
    if (this.cached?.url !== callbackUrl) {
      this.cached = { url: callbackUrl, promise: this.performCallback(callbackUrl) }
    }

    return this.cached.promise
  }

  private async performCallback(callbackUrl: string): Promise<TenantContext> {
    const session = await this.authRepository.handleCallback(callbackUrl)

    return toTenantContext(session.user)
  }
}
