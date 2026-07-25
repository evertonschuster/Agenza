import type { UserManager } from 'oidc-client-ts'
import type {
  AuthCallbackResult,
  AuthRepository,
  LoginTheme,
} from '@/features/auth/application/repositories/AuthRepository'
import { Session } from '@/features/auth/domain/entities/Session'
import { mapOidcUserToSession } from '@/features/auth/infrastructure/oidcUserToSessionMapper'
import {
  mapCallbackError,
  mapLoginStartError,
} from '@/features/auth/infrastructure/mapOidcErrorToAuthFlowError'

const RENEWAL_WINDOW_MS = 60_000

export class OidcAuthRepository implements AuthRepository {
  private readonly userManager: UserManager
  private renewalInFlight: Promise<Session | null> | null = null

  constructor(userManager: UserManager) {
    this.userManager = userManager
  }

  async initiateLogin(returnTo: string, theme: LoginTheme): Promise<void> {
    try {
      await this.userManager.signinRedirect({
        state: returnTo,
        extraQueryParams: { theme },
      })
    } catch (error) {
      throw mapLoginStartError(error)
    }
  }

  async handleCallback(callbackUrl: string): Promise<AuthCallbackResult> {
    try {
      const oidcUser = await this.userManager.signinRedirectCallback(callbackUrl)

      return {
        session: mapOidcUserToSession(oidcUser),
        returnTo: typeof oidcUser.state === 'string' ? oidcUser.state : null,
      }
    } catch (error) {
      throw mapCallbackError(error)
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

    this.renewalInFlight ??= this.renewSession(cachedSession).finally(() => {
      this.renewalInFlight = null
    })

    return this.renewalInFlight
  }

  private async renewSession(cachedSession: Session): Promise<Session | null> {
    try {
      const renewedOidcUser = await this.userManager.signinSilent()

      if (renewedOidcUser === null) {
        await this.userManager.removeUser()
        return null
      }

      const renewedSession = mapOidcUserToSession(renewedOidcUser)
      const identityChanged =
        renewedSession.user.id !== cachedSession.user.id ||
        renewedSession.user.tenant.id !== cachedSession.user.tenant.id

      if (identityChanged) {
        await this.userManager.removeUser()
        return null
      }

      return renewedSession
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
