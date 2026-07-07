import type { UserManager } from 'oidc-client-ts'
import type { AuthRepository } from '../../application/repositories/AuthRepository'
import { Session } from '../../domain/entities/Session'
import { mapOidcUserToSession } from '../mappers/oidcUserToSessionMapper'

/**
 * AuthRepository implementation backed by oidc-client-ts's UserManager.
 * This is the only place in the codebase that talks to oidc-client-ts
 * directly - everything above this (use cases, presentation) only ever
 * sees the AuthRepository interface and domain types.
 *
 * getCurrentSession() owns the full "try silent renewal, log out on
 * failure" sequence per product decision: callers never see partial or
 * in-between states, only a valid Session or null.
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
