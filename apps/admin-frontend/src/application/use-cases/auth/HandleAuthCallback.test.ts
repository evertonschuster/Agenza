import { describe, it, expect } from 'vitest'
import { HandleAuthCallback } from './HandleAuthCallback'
import { createFakeAuthRepository } from '../../test-helpers/createFakeAuthRepository'
import { Session } from '../../../domain/entities/Session'
import { User } from '../../../domain/entities/User'
import { Tenant } from '../../../domain/value-objects/Tenant'

describe('HandleAuthCallback', () => {
  it('returns the tenant context when the callback is handled successfully', async () => {
    const tenant = Tenant.create('tenant-123')
    const user = User.create({ id: 'user-1', tenant })
    const session = Session.create({
      user,
      accessToken: 'token',
      expiresAt: new Date('2099-01-01T00:00:00Z'),
    })

    const authRepository = createFakeAuthRepository({
      handleCallback: () => Promise.resolve(session),
    })

    const handleAuthCallback = new HandleAuthCallback(authRepository)
    const result = await handleAuthCallback.execute(
      'https://admin.example.com/callback?code=abc123&state=xyz',
    )

    expect(result.tenant.equals(tenant)).toBe(true)
    expect(result.user).toBe(user)
  })

  it('passes the callback URL through to the repository unchanged', async () => {
    const tenant = Tenant.create('tenant-123')
    const user = User.create({ id: 'user-1', tenant })
    const session = Session.create({
      user,
      accessToken: 'token',
      expiresAt: new Date('2099-01-01T00:00:00Z'),
    })

    let receivedUrl: string | undefined
    const authRepository = createFakeAuthRepository({
      handleCallback: url => {
        receivedUrl = url
        return Promise.resolve(session)
      },
    })

    const handleAuthCallback = new HandleAuthCallback(authRepository)
    const callbackUrl = 'https://admin.example.com/callback?code=abc123&state=xyz'
    await handleAuthCallback.execute(callbackUrl)

    expect(receivedUrl).toBe(callbackUrl)
  })

  it('propagates the error when token exchange fails', async () => {
    const authRepository = createFakeAuthRepository({
      handleCallback: () => Promise.reject(new Error('invalid_grant: code expired')),
    })

    const handleAuthCallback = new HandleAuthCallback(authRepository)

    await expect(
      handleAuthCallback.execute('https://admin.example.com/callback?error=access_denied'),
    ).rejects.toThrow('invalid_grant: code expired')
  })
})
