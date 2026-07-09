import { createUserManager } from '../infrastructure/config/createUserManager'
import { OidcAuthRepository } from '../infrastructure/auth/OidcAuthRepository'
import { AuthenticatedHttpClient } from '../infrastructure/http/AuthenticatedHttpClient'
import type { AuthRepository } from '../application/repositories/AuthRepository'
import type { HttpClient } from '../application/ports/HttpClient'
import { InitiateLogin } from '../application/use-cases/auth/InitiateLogin'
import { HandleAuthCallback } from '../application/use-cases/auth/HandleAuthCallback'
import { GetCurrentSession } from '../application/use-cases/auth/GetCurrentSession'
import { Logout } from '../application/use-cases/auth/Logout'

export interface AppContainer {
  authRepository: AuthRepository
  httpClient: HttpClient
  useCases: {
    initiateLogin: InitiateLogin
    handleAuthCallback: HandleAuthCallback
    getCurrentSession: GetCurrentSession
    logout: Logout
  }
}

/**
 * Builds the application's dependency graph. This is the one place
 * outside of infrastructure/ itself that is allowed to know
 * OidcAuthRepository exists - everywhere else (hooks, components, even
 * other use cases) depends only on the AuthRepository interface or on
 * already-constructed use case instances handed to it.
 *
 * Takes no parameters and reads no config directly: createUserManager
 * already isolates environment variable access, so swapping how
 * configuration is sourced never requires touching this file.
 */
export function createAppContainer(): AppContainer {
  const userManager = createUserManager()
  const authRepository: AuthRepository = new OidcAuthRepository(userManager)

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
  if (!apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL is not set. Check your .env.local (see .env.example).')
  }

  const httpClient: HttpClient = new AuthenticatedHttpClient(apiBaseUrl, async () => {
    const session = await authRepository.getCurrentSession()
    return session?.accessToken ?? null
  })

  return {
    authRepository,
    httpClient,
    useCases: {
      initiateLogin: new InitiateLogin(authRepository),
      handleAuthCallback: new HandleAuthCallback(authRepository),
      getCurrentSession: new GetCurrentSession(authRepository),
      logout: new Logout(authRepository),
    },
  }
}
