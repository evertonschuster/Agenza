import type { UserManager } from 'oidc-client-ts'
import type { AuthRepository } from '@/features/auth/application/repositories/AuthRepository'
import { Session } from '@/features/auth/domain/entities/Session'
import { mapOidcUserToSession } from '@/features/auth/infrastructure/oidcUserToSessionMapper'

/**
 * AuthRepository implementation backed by oidc-client-ts's UserManager -
 * the only place that drives its runtime behavior (other files reference
 * the package too, but only to build config or map its User type).
 *
 * getCurrentSession() owns the full "try silent renewal, log out on
 * failure" sequence: callers only ever see a valid Session or null.
 */
export class OidcAuthRepository implements AuthRepository {
  private readonly userManager: UserManager

  constructor(userManager: UserManager) {
    this.userManager = userManager
  }

  async initiateLogin(): Promise<void> {
    await this.userManager.signinRedirect()
  }

  async handleCallback(callbackUrl: string): Promise<Session> {
    const oidcUser = await this.userManager.signinRedirectCallback(callbackUrl)

    return mapOidcUserToSession(oidcUser)
  }

  async getCurrentSession(): Promise<Session | null> {
    const cachedOidcUser = await this.userManager.getUser()

    if (cachedOidcUser === null) {
      return null
    }

    const cachedSession = mapOidcUserToSession(cachedOidcUser)

    if (!cachedSession.isExpiredAt(new Date())) {
      return cachedSession
    }

    try {
      const renewedOidcUser = await this.userManager.signinSilent()

      if (renewedOidcUser === null) {
        await this.userManager.removeUser()
        return null
      }

      return mapOidcUserToSession(renewedOidcUser)
    } catch {
      // Silent renewal failed (e.g. "login_required", network error, or
      // the refresh token itself expired). Per product decision: clear
      // the stale local session rather than leaving it half-valid, and
      // report "no session" so callers redirect to login.
      await this.userManager.removeUser()
      return null
    }
  }

  async logout(): Promise<void> {
    await this.userManager.removeUser()
    await this.userManager.signoutRedirect()
  }
}
