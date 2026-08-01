import type { UserManager } from 'oidc-client-ts'
import type {
  AuthCallbackResult,
  AuthRepository,
  LoginTheme,
} from '@/features/auth/application/repositories/AuthRepository'
import type { AuthFlowError } from '@/features/auth/application/errors/AuthFlowError'
import { Session } from '@/features/auth/domain/entities/Session'
import { mapOidcUserToSession } from '@/features/auth/infrastructure/oidcUserToSessionMapper'
import {
  mapCallbackError,
  mapLoginStartError,
  mapLogoutError,
} from '@/features/auth/infrastructure/mapOidcErrorToAuthFlowError'
import { failure, success, type Result } from '@/shared/application/Result'

const RENEWAL_WINDOW_MS = 60_000

export class OidcAuthRepository implements AuthRepository {
  private readonly userManager: UserManager
  private renewalInFlight: Promise<Session | null> | null = null

  constructor(userManager: UserManager) {
    this.userManager = userManager
  }

  async initiateLogin(returnTo: string, theme: LoginTheme): Promise<Result<void, AuthFlowError>> {
    try {
      await this.userManager.signinRedirect({
        state: returnTo,
        extraQueryParams: { theme },
      })
      return success(undefined)
    } catch (error) {
      return failure(mapLoginStartError(error))
    }
  }

  async handleCallback(callbackUrl: string): Promise<Result<AuthCallbackResult, AuthFlowError>> {
    try {
      const oidcUser = await this.userManager.signinRedirectCallback(callbackUrl)
      const sessionResult = mapOidcUserToSession(oidcUser)
      if (!sessionResult.success) {
        return failure(mapCallbackError(sessionResult.error))
      }

      return success({
        session: sessionResult.value,
        returnTo: typeof oidcUser.state === 'string' ? oidcUser.state : null,
      })
    } catch (error) {
      return failure(mapCallbackError(error))
    }
  }

  async getCurrentSession(): Promise<Session | null> {
    try {
      const cachedOidcUser = await this.userManager.getUser()
      if (cachedOidcUser === null) {
        return null
      }

      const cachedSessionResult = mapOidcUserToSession(cachedOidcUser)
      if (!cachedSessionResult.success) {
        // A cached user that no longer maps to a valid session (e.g. a
        // misconfigured client dropped the tenant_id claim) can't be
        // trusted - same recovery as a failed renewal below.
        return await this.clearAndReturnNull()
      }
      const cachedSession = cachedSessionResult.value

      const renewalThreshold = new Date(Date.now() + RENEWAL_WINDOW_MS)
      if (!cachedSession.isExpiredAt(renewalThreshold)) {
        return cachedSession
      }

      this.renewalInFlight ??= this.renewSession(cachedSession).finally(() => {
        this.renewalInFlight = null
      })

      return await this.renewalInFlight
    } catch {
      // Reading the cached user itself failed (e.g. corrupted storage) -
      // fail closed rather than leave a half-valid session in place.
      return this.clearAndReturnNull()
    }
  }

  private async renewSession(cachedSession: Session): Promise<Session | null> {
    try {
      const renewedOidcUser = await this.userManager.signinSilent()

      if (renewedOidcUser === null) {
        return await this.clearAndReturnNull()
      }

      const renewedSessionResult = mapOidcUserToSession(renewedOidcUser)
      if (!renewedSessionResult.success) {
        return await this.clearAndReturnNull()
      }
      const renewedSession = renewedSessionResult.value

      // Silent renewal must never let a refreshed token for one identity
      // reach state still keyed to another - discard and require a full
      // login if either claim changed (apps/admin-frontend/AGENTS.md).
      const identityChanged =
        renewedSession.user.id !== cachedSession.user.id ||
        renewedSession.user.tenant.id !== cachedSession.user.tenant.id

      if (identityChanged) {
        return await this.clearAndReturnNull()
      }

      return renewedSession
    } catch {
      // Renewal failed - clear the stale session rather than leave it half-valid.
      return this.clearAndReturnNull()
    }
  }

  private async clearAndReturnNull(): Promise<null> {
    await this.userManager.removeUser()
    return null
  }

  async logout(): Promise<Result<void, AuthFlowError>> {
    try {
      await this.userManager.removeUser()
      await this.userManager.signoutRedirect()
      return success(undefined)
    } catch (error) {
      return failure(mapLogoutError(error))
    }
  }
}
