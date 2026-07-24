import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createUserManager } from '@/features/auth/infrastructure/createUserManager'

describe('createUserManager', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_OIDC_AUTHORITY', 'https://identity.example.com')
    vi.stubEnv('VITE_OIDC_CLIENT_ID', 'admin-panel')
    vi.stubEnv('VITE_OIDC_REDIRECT_URI', 'https://app.example.com/callback')
    vi.stubEnv('VITE_OIDC_POST_LOGOUT_REDIRECT_URI', 'https://app.example.com/login')
    vi.stubEnv('VITE_OIDC_SCOPE', 'openid profile tenant_id')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('maps every OIDC setting from environment configuration', () => {
    const userManager = createUserManager()

    expect(userManager.settings.authority).toBe('https://identity.example.com')
    expect(userManager.settings.client_id).toBe('admin-panel')
    expect(userManager.settings.redirect_uri).toBe('https://app.example.com/callback')
    expect(userManager.settings.post_logout_redirect_uri).toBe('https://app.example.com/login')
    expect(userManager.settings.scope).toBe('openid profile tenant_id')
  })

  it('keeps silent renewal explicit rather than automatic (ADR 004)', () => {
    const userManager = createUserManager()

    expect(userManager.settings.automaticSilentRenew).toBe(false)
  })
})
