import type { UserManager } from 'oidc-client-ts'
import type {
  AuthCallbackResult,
  AuthRepository,
} from '@/features/auth/application/repositories/AuthRepository'
import { Session } from '@/features/auth/domain/entities/Session'
import { mapOidcUserToSession } from '@/features/auth/infrastructure/oidcUserToSessionMapper'

const RENEWAL_WINDOW_MS = 60_000

export class OidcAuthRepository implements AuthRepository {
  private readonly userManager: UserManager
  private renewalInFlight: Promise<Session | null> | null = null

  constructor(userManager: UserManager) {
    this.userManager = userManager
  }

  async initiateLogin(returnTo: string): Promise<void> {
    await this.userManager.signinRedirect({ state: returnTo })
  }

  async handleCallback(callbackUrl: string): Promise<AuthCallbackResult> {
    const oidcUser = await this.userManager.signinRedirectCallback(callbackUrl)

    return {
      session: mapOidcUserToSession(oidcUser),
      returnTo: typeof oidcUser.state === 'string' ? oidcUser.state : null,
    }
  }

  async getCurrentSession(): Promise<Session | null> {
    const cachedOidcUser = await this.userManager.getUser()

    if (cachedOidcUser === null) {
      return null
    }

    const cachedSession = mapOidcUserToSession(cachedOidcUser)

    const renewalThreshold = new Date(Date.now() + RENEWAL_WINDOW_MS)
    if (!cachedSession.isExpiredAt(renewalThreshold)) {
      return cachedSession
    }

    this.renewalInFlight ??= this.renewSession().finally(() => {
      this.renewalInFlight = null
    })

    return this.renewalInFlight
  }

  private async renewSession(): Promise<Session | null> {
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
