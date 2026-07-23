import { describe, it, expect } from 'vitest'
import type { User as OidcUser } from 'oidc-client-ts'
import { mapOidcUserToSession } from '@/features/auth/infrastructure/oidcUserToSessionMapper'
import { MissingTenantClaimError } from '@/features/auth/infrastructure/MissingTenantClaimError'

function createFakeOidcUser(overrides: Partial<OidcUser> = {}): OidcUser {
  return {
    access_token: 'access-token-value',
    expires_at: 1_800_000_000, // unix seconds
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

describe('mapOidcUserToSession', () => {
  it('maps a valid oidc-client-ts User into a domain Session', () => {
    const oidcUser = createFakeOidcUser()

    const session = mapOidcUserToSession(oidcUser)

    expect(session.accessToken).toBe('access-token-value')
    expect(session.user.id).toBe('user-1')
    expect(session.user.tenant.id).toBe('tenant-123')
    expect(session.expiresAt).toEqual(new Date(1_800_000_000 * 1000))
  })

  it('maps optional email and name claims onto the domain User when present', () => {
    const oidcUser = createFakeOidcUser({
      profile: {
        sub: 'user-1',
        tenant_id: 'tenant-123',
        email: 'owner@clinic.com',
        name: 'Dr. Owner',
        iss: 'https://identity.example.com',
        aud: 'admin-panel',
        exp: 1_800_000_000,
        iat: 1_799_996_400,
      },
    })

    const session = mapOidcUserToSession(oidcUser)

    expect(session.user.email).toBe('owner@clinic.com')
    expect(session.user.name).toBe('Dr. Owner')
  })

  it('throws MissingTenantClaimError when tenant_id is absent from the claims', () => {
    const oidcUser = createFakeOidcUser({
      profile: {
        sub: 'user-1',
        iss: 'https://identity.example.com',
        aud: 'admin-panel',
        exp: 1_800_000_000,
        iat: 1_799_996_400,
      },
    })

    expect(() => mapOidcUserToSession(oidcUser)).toThrow(MissingTenantClaimError)
  })

  it('throws MissingTenantClaimError when tenant_id is an empty string', () => {
    const oidcUser = createFakeOidcUser({
      profile: {
        sub: 'user-1',
        tenant_id: '',
        iss: 'https://identity.example.com',
        aud: 'admin-panel',
        exp: 1_800_000_000,
        iat: 1_799_996_400,
      },
    })

    expect(() => mapOidcUserToSession(oidcUser)).toThrow(MissingTenantClaimError)
  })

  it('throws when expires_at is missing, since session validity cannot be determined', () => {
    const { expires_at, ...oidcUserWithoutExpiry } = createFakeOidcUser()
    void expires_at // intentionally discarded - this test asserts behavior when it's absent

    expect(() => mapOidcUserToSession(oidcUserWithoutExpiry as OidcUser)).toThrow()
  })
})
