import { describe, it, expect } from 'vitest'
import type { User as OidcUser } from 'oidc-client-ts'
import { mapOidcUserToSession } from '@/features/auth/infrastructure/oidcUserToSessionMapper'
import { MissingTenantClaimError } from '@/features/auth/infrastructure/MissingTenantClaimError'
import { MissingExpiryClaimError } from '@/features/auth/infrastructure/MissingExpiryClaimError'

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

    const result = mapOidcUserToSession(oidcUser)

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.value.accessToken).toBe('access-token-value')
    expect(result.value.user.id).toBe('user-1')
    expect(result.value.user.tenant.id).toBe('tenant-123')
    expect(result.value.expiresAt).toEqual(new Date(1_800_000_000 * 1000))
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

    const result = mapOidcUserToSession(oidcUser)

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.value.user.email).toBe('owner@clinic.com')
    expect(result.value.user.name).toBe('Dr. Owner')
  })

  it('fails with MissingTenantClaimError when tenant_id is absent from the claims', () => {
    const oidcUser = createFakeOidcUser({
      profile: {
        sub: 'user-1',
        iss: 'https://identity.example.com',
        aud: 'admin-panel',
        exp: 1_800_000_000,
        iat: 1_799_996_400,
      },
    })

    const result = mapOidcUserToSession(oidcUser)

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toBeInstanceOf(MissingTenantClaimError)
  })

  it('fails with MissingTenantClaimError when tenant_id is an empty string', () => {
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

    const result = mapOidcUserToSession(oidcUser)

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toBeInstanceOf(MissingTenantClaimError)
  })

  it('fails with MissingExpiryClaimError when expires_at is missing', () => {
    const { expires_at, ...oidcUserWithoutExpiry } = createFakeOidcUser()
    void expires_at // intentionally discarded - this test asserts behavior when it's absent

    const result = mapOidcUserToSession(oidcUserWithoutExpiry as OidcUser)

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toBeInstanceOf(MissingExpiryClaimError)
  })
})
