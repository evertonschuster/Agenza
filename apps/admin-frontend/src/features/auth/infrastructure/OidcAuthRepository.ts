import type { UserManager } from 'oidc-client-ts'
import type { AuthRepository } from '@/features/auth/application/repositories/AuthRepository'
import { Session } from '@/features/auth/domain/entities/Session'
import { mapOidcUserToSession } from '@/features/auth/infrastructure/oidcUserToSessionMapper'

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
      // Renewal failed - clear the stale session rather than leave it half-valid.
      await this.userManager.removeUser()
      return null
    }
  }

  async logout(): Promise<void> {
    await this.userManager.removeUser()
    await this.userManager.signoutRedirect()
  }
}
