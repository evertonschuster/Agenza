import { describe, it, expect, vi } from 'vitest'
import type { Mock } from 'vitest'
import type { User as OidcUser, UserManager } from 'oidc-client-ts'
import { OidcAuthRepository } from '@/features/auth/infrastructure/OidcAuthRepository'
import { MissingTenantClaimError } from '@/features/auth/infrastructure/MissingTenantClaimError'

function createFakeOidcUser(overrides: Partial<OidcUser> = {}): OidcUser {
  return {
    access_token: 'access-token-value',
    expires_at: 1_800_000_000,
    profile: {
      sub: 'user-1',
      tenant_id: 'tenant-123',
      iss: 'https://identity.example.com',
      aud: 'admin-panel',
      exp: 1_800_000_000,
      iat: 1_799_996_400,
    },
    ...overrides,
  } as OidcUser
}

interface FakeUserManager {
  signinRedirect: Mock
  signinRedirectCallback: Mock
  signinSilent: Mock
  getUser: Mock
  removeUser: Mock
  signoutRedirect: Mock
}

function createFakeUserManager(overrides: Partial<FakeUserManager> = {}): FakeUserManager {
  return {
    signinRedirect: vi.fn(() => Promise.resolve()),
    signinRedirectCallback: vi.fn(() => Promise.resolve(createFakeOidcUser())),
    signinSilent: vi.fn(() => Promise.resolve(createFakeOidcUser())),
    getUser: vi.fn(() => Promise.resolve(null)),
    removeUser: vi.fn(() => Promise.resolve()),
    signoutRedirect: vi.fn(() => Promise.resolve()),
    ...overrides,
  }
}

describe('OidcAuthRepository', () => {
  describe('initiateLogin', () => {
    it('delegates to userManager.signinRedirect', async () => {
      const userManager = createFakeUserManager()
      const repository = new OidcAuthRepository(userManager as unknown as UserManager)

      await repository.initiateLogin('/services?search=massagem#editor')

      expect(userManager.signinRedirect).toHaveBeenCalledExactlyOnceWith({
        state: '/services?search=massagem#editor',
      })
    })
  })

  describe('handleCallback', () => {
    it('exchanges the callback URL and returns the mapped Session', async () => {
      const userManager = createFakeUserManager()
      const repository = new OidcAuthRepository(userManager as unknown as UserManager)

      const result = await repository.handleCallback('https://admin.example.com/callback?code=abc')

      expect(userManager.signinRedirectCallback).toHaveBeenCalledWith(
        'https://admin.example.com/callback?code=abc',
      )
      expect(result.session.user.tenant.id).toBe('tenant-123')
      expect(result.returnTo).toBeNull()
    })

    it('returns the string application state that was carried through the provider', async () => {
      const userManager = createFakeUserManager({
        signinRedirectCallback: vi.fn(() =>
          Promise.resolve(createFakeOidcUser({ state: '/services?search=massagem#editor' })),
        ),
      })
      const repository = new OidcAuthRepository(userManager as unknown as UserManager)

      const result = await repository.handleCallback(
        'https://admin.example.com/callback?code=abc&state=oidc-state',
      )

      expect(result.returnTo).toBe('/services?search=massagem#editor')
    })

    it('propagates MissingTenantClaimError when the token has no tenant_id', async () => {
      const userManager = createFakeUserManager({
        signinRedirectCallback: vi.fn(() =>
          Promise.resolve(
            createFakeOidcUser({
              profile: {
                sub: 'user-1',
                iss: 'https://identity.example.com',
                aud: 'admin-panel',
                exp: 1_800_000_000,
                iat: 1_799_996_400,
              },
            }),
          ),
        ),
      })
      const repository = new OidcAuthRepository(userManager as unknown as UserManager)

      await expect(
        repository.handleCallback('https://admin.example.com/callback?code=abc'),
      ).rejects.toThrow(MissingTenantClaimError)
    })
  })

  describe('getCurrentSession', () => {
    it('returns the mapped Session when a valid (non-expiring) user is cached', async () => {
      const userManager = createFakeUserManager({
        getUser: vi.fn(() => Promise.resolve(createFakeOidcUser({ expires_at: 9_999_999_999 }))),
      })
      const repository = new OidcAuthRepository(userManager as unknown as UserManager)

      const session = await repository.getCurrentSession()

      expect(session).not.toBeNull()
      expect(userManager.signinSilent).not.toHaveBeenCalled()
    })

    it('returns null when there is no cached user at all', async () => {
      const userManager = createFakeUserManager({ getUser: vi.fn(() => Promise.resolve(null)) })
      const repository = new OidcAuthRepository(userManager as unknown as UserManager)

      const session = await repository.getCurrentSession()

      expect(session).toBeNull()
    })

    it('attempts silent renewal when the cached user is expired, and returns the renewed session on success', async () => {
      const expiredUser = createFakeOidcUser({ expires_at: 1 })
      const renewedUser = createFakeOidcUser({ expires_at: 9_999_999_999 })
      const userManager = createFakeUserManager({
        getUser: vi.fn(() => Promise.resolve(expiredUser)),
        signinSilent: vi.fn(() => Promise.resolve(renewedUser)),
      })
      const repository = new OidcAuthRepository(userManager as unknown as UserManager)

      const session = await repository.getCurrentSession()

      expect(userManager.signinSilent).toHaveBeenCalledTimes(1)
      expect(session).not.toBeNull()
      expect(session?.isExpiredAt(new Date())).toBe(false)
    })

    it('renews before expiry so a request never starts with a token about to expire', async () => {
      const expiringUser = createFakeOidcUser({
        expires_at: Math.floor(Date.now() / 1000) + 30,
      })
      const renewedUser = createFakeOidcUser({ expires_at: 9_999_999_999 })
      const userManager = createFakeUserManager({
        getUser: vi.fn(() => Promise.resolve(expiringUser)),
        signinSilent: vi.fn(() => Promise.resolve(renewedUser)),
      })
      const repository = new OidcAuthRepository(userManager as unknown as UserManager)

      const session = await repository.getCurrentSession()

      expect(userManager.signinSilent).toHaveBeenCalledTimes(1)
      expect(session?.isExpiredAt(new Date())).toBe(false)
    })

    it('shares one silent renewal across concurrent session reads', async () => {
      const expiredUser = createFakeOidcUser({ expires_at: 1 })
      const renewedUser = createFakeOidcUser({ expires_at: 9_999_999_999 })
      const userManager = createFakeUserManager({
        getUser: vi.fn(() => Promise.resolve(expiredUser)),
        signinSilent: vi.fn(() => Promise.resolve(renewedUser)),
      })
      const repository = new OidcAuthRepository(userManager as unknown as UserManager)

      const [first, second] = await Promise.all([
        repository.getCurrentSession(),
        repository.getCurrentSession(),
      ])

      expect(userManager.signinSilent).toHaveBeenCalledTimes(1)
      expect(first?.accessToken).toBe('access-token-value')
      expect(second?.accessToken).toBe('access-token-value')
    })

    it('clears the session and returns null when silent renewal fails', async () => {
      const expiredUser = createFakeOidcUser({ expires_at: 1 })
      const userManager = createFakeUserManager({
        getUser: vi.fn(() => Promise.resolve(expiredUser)),
        signinSilent: vi.fn(() => Promise.reject(new Error('login_required'))),
      })
      const repository = new OidcAuthRepository(userManager as unknown as UserManager)

      const session = await repository.getCurrentSession()

      expect(session).toBeNull()
      expect(userManager.removeUser).toHaveBeenCalledTimes(1)
    })
  })

  describe('logout', () => {
    it('clears the local session and redirects to the end-session endpoint', async () => {
      const userManager = createFakeUserManager()
      const repository = new OidcAuthRepository(userManager as unknown as UserManager)

      await repository.logout()

      expect(userManager.removeUser).toHaveBeenCalledTimes(1)
      expect(userManager.signoutRedirect).toHaveBeenCalledTimes(1)
    })
  })
})
