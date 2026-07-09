import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createAppContainer } from './container'
import { OidcAuthRepository } from '../infrastructure/auth/OidcAuthRepository'
import { AuthenticatedHttpClient } from '../infrastructure/http/AuthenticatedHttpClient'
import { InitiateLogin } from '../application/use-cases/auth/InitiateLogin'
import { HandleAuthCallback } from '../application/use-cases/auth/HandleAuthCallback'
import { GetCurrentSession } from '../application/use-cases/auth/GetCurrentSession'
import { Logout } from '../application/use-cases/auth/Logout'

function stubOidcEnv(): void {
  vi.stubEnv('VITE_OIDC_AUTHORITY', 'https://identity.example.com')
  vi.stubEnv('VITE_OIDC_CLIENT_ID', 'admin-panel')
  vi.stubEnv('VITE_OIDC_REDIRECT_URI', 'https://app.example.com/callback')
  vi.stubEnv('VITE_OIDC_POST_LOGOUT_REDIRECT_URI', 'https://app.example.com/login')
  vi.stubEnv('VITE_OIDC_SCOPE', 'openid profile tenant_id')
}

describe('createAppContainer', () => {
  beforeEach(() => {
    stubOidcEnv()
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('wires the full dependency graph from concrete implementations', () => {
    const container = createAppContainer()

    expect(container.authRepository).toBeInstanceOf(OidcAuthRepository)
    expect(container.httpClient).toBeInstanceOf(AuthenticatedHttpClient)
    expect(container.useCases.initiateLogin).toBeInstanceOf(InitiateLogin)
    expect(container.useCases.handleAuthCallback).toBeInstanceOf(HandleAuthCallback)
    expect(container.useCases.getCurrentSession).toBeInstanceOf(GetCurrentSession)
    expect(container.useCases.logout).toBeInstanceOf(Logout)
  })

  it('fails fast when VITE_API_BASE_URL is missing', () => {
    vi.stubEnv('VITE_API_BASE_URL', '')

    expect(() => createAppContainer()).toThrow(/VITE_API_BASE_URL/)
  })
})
