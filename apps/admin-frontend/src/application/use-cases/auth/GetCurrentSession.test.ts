import { describe, it, expect } from 'vitest'
import { GetCurrentSession } from './GetCurrentSession'
import { createFakeAuthRepository } from '../../test-helpers/createFakeAuthRepository'
import { Session } from '../../../domain/entities/Session'
import { User } from '../../../domain/entities/User'
import { Tenant } from '../../../domain/value-objects/Tenant'

describe('GetCurrentSession', () => {
  it('returns the tenant context when a valid session exists', async () => {
    const tenant = Tenant.create('tenant-123')
    const user = User.create({ id: 'user-1', tenant })
    const session = Session.create({
      user,
      accessToken: 'token',
      expiresAt: new Date('2099-01-01T00:00:00Z'),
    })

    const authRepository = createFakeAuthRepository({
      getCurrentSession: () => Promise.resolve(session),
    })

    const getCurrentSession = new GetCurrentSession(authRepository)
    const result = await getCurrentSession.execute()

    expect(result).not.toBeNull()
    expect(result?.tenant.equals(tenant)).toBe(true)
    expect(result?.user).toBe(user)
  })

  it('returns null when there is no current session', async () => {
    const authRepository = createFakeAuthRepository({
      getCurrentSession: () => Promise.resolve(null),
    })

    const getCurrentSession = new GetCurrentSession(authRepository)
    const result = await getCurrentSession.execute()

    expect(result).toBeNull()
  })
})
