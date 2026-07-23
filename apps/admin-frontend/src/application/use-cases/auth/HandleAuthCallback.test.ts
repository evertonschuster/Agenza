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

  it('exchanges the code only once for two concurrent calls with the same callback URL', async () => {
    const tenant = Tenant.create('tenant-123')
    const user = User.create({ id: 'user-1', tenant })
    const session = Session.create({
      user,
      accessToken: 'token',
      expiresAt: new Date('2099-01-01T00:00:00Z'),
    })
    let callCount = 0
    const authRepository = createFakeAuthRepository({
      handleCallback: () => {
        callCount += 1
        return Promise.resolve(session)
      },
    })

    const handleAuthCallback = new HandleAuthCallback(authRepository)
    const callbackUrl = 'https://admin.example.com/callback?code=abc123&state=xyz'

    // Simulates React.StrictMode's double effect invoke: two calls with
    // the exact same URL, fired before either has resolved.
    const [first, second] = await Promise.all([
      handleAuthCallback.execute(callbackUrl),
      handleAuthCallback.execute(callbackUrl),
    ])

    expect(callCount).toBe(1)
    expect(first).toBe(second)
  })

  it('exchanges the code only once for a sequential repeat call with the same callback URL', async () => {
    const tenant = Tenant.create('tenant-123')
    const user = User.create({ id: 'user-1', tenant })
    const session = Session.create({
      user,
      accessToken: 'token',
      expiresAt: new Date('2099-01-01T00:00:00Z'),
    })
    let callCount = 0
    const authRepository = createFakeAuthRepository({
      handleCallback: () => {
        callCount += 1
        return Promise.resolve(session)
      },
    })

    const handleAuthCallback = new HandleAuthCallback(authRepository)
    const callbackUrl = 'https://admin.example.com/callback?code=abc123&state=xyz'

    await handleAuthCallback.execute(callbackUrl)
    await handleAuthCallback.execute(callbackUrl)

    expect(callCount).toBe(1)
  })

  it('propagates the same rejection to every caller sharing a failed callback URL', async () => {
    let callCount = 0
    const authRepository = createFakeAuthRepository({
      handleCallback: () => {
        callCount += 1
        return Promise.reject(new Error('invalid_grant: code expired'))
      },
    })

    const handleAuthCallback = new HandleAuthCallback(authRepository)
    const callbackUrl = 'https://admin.example.com/callback?code=abc123&state=xyz'

    const [firstResult, secondResult] = await Promise.allSettled([
      handleAuthCallback.execute(callbackUrl),
      handleAuthCallback.execute(callbackUrl),
    ])

    expect(callCount).toBe(1)
    expect(firstResult.status).toBe('rejected')
    expect(secondResult.status).toBe('rejected')
  })

  it('exchanges the code again for a different callback URL (a fresh login)', async () => {
    const tenant = Tenant.create('tenant-123')
    const user = User.create({ id: 'user-1', tenant })
    const session = Session.create({
      user,
      accessToken: 'token',
      expiresAt: new Date('2099-01-01T00:00:00Z'),
    })
    let callCount = 0
    const authRepository = createFakeAuthRepository({
      handleCallback: () => {
        callCount += 1
        return Promise.resolve(session)
      },
    })

    const handleAuthCallback = new HandleAuthCallback(authRepository)

    await handleAuthCallback.execute('https://admin.example.com/callback?code=first&state=xyz')
    await handleAuthCallback.execute('https://admin.example.com/callback?code=second&state=abc')

    expect(callCount).toBe(2)
  })
})
