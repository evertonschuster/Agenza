import { describe, it, expect } from 'vitest'
import { HandleAuthCallback } from '@/features/auth/application/use-cases/HandleAuthCallback'
import { createFakeAuthRepository } from '@/features/auth/application/test-helpers/createFakeAuthRepository'
import { Session } from '@/features/auth/domain/entities/Session'
import { User } from '@/features/auth/domain/entities/User'
import { Tenant } from '@/features/auth/domain/value-objects/Tenant'
import type { AuthCallbackResult } from '@/features/auth/application/repositories/AuthRepository'

function callbackResult(session: Session, returnTo: string | null = null): AuthCallbackResult {
  return { session, returnTo }
}

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
      handleCallback: () => Promise.resolve(callbackResult(session)),
    })

    const handleAuthCallback = new HandleAuthCallback(authRepository)
    const result = await handleAuthCallback.execute(
      'https://admin.example.com/callback?code=abc123&state=xyz',
    )

    expect(result.tenantContext.tenant.equals(tenant)).toBe(true)
    expect(result.tenantContext.user).toBe(user)
    expect(result.returnTo).toBe('/dashboard')
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
        return Promise.resolve(callbackResult(session))
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
        return Promise.resolve(callbackResult(session))
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
        return Promise.resolve(callbackResult(session))
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
        return Promise.resolve(callbackResult(session))
      },
    })

    const handleAuthCallback = new HandleAuthCallback(authRepository)

    await handleAuthCallback.execute('https://admin.example.com/callback?code=first&state=xyz')
    await handleAuthCallback.execute('https://admin.example.com/callback?code=second&state=abc')

    expect(callCount).toBe(2)
  })

  it('returns a validated internal destination carried through the login callback', async () => {
    const tenant = Tenant.create('tenant-123')
    const user = User.create({ id: 'user-1', tenant })
    const session = Session.create({
      user,
      accessToken: 'token',
      expiresAt: new Date('2099-01-01T00:00:00Z'),
    })
    const authRepository = createFakeAuthRepository({
      handleCallback: () =>
        Promise.resolve(callbackResult(session, '/services?search=massagem#editor')),
    })

    const result = await new HandleAuthCallback(authRepository).execute(
      'https://admin.example.com/callback?code=abc',
    )

    expect(result.returnTo).toBe('/services?search=massagem#editor')
  })

  it('falls back to the dashboard when callback state contains an external URL', async () => {
    const tenant = Tenant.create('tenant-123')
    const user = User.create({ id: 'user-1', tenant })
    const session = Session.create({
      user,
      accessToken: 'token',
      expiresAt: new Date('2099-01-01T00:00:00Z'),
    })
    const authRepository = createFakeAuthRepository({
      handleCallback: () =>
        Promise.resolve(callbackResult(session, 'https://evil.example/steal-session')),
    })

    const result = await new HandleAuthCallback(authRepository).execute(
      'https://admin.example.com/callback?code=abc',
    )

    expect(result.returnTo).toBe('/dashboard')
  })
})
