import { describe, it, expect } from 'vitest'
import { Session } from '@/features/auth/domain/entities/Session'
import { User } from '@/features/auth/domain/entities/User'
import { Tenant } from '@/features/auth/domain/value-objects/Tenant'

describe('Session', () => {
  const tenant = Tenant.create('tenant-123')
  const user = User.create({ id: 'user-1', tenant })

  it('creates a session with a user, access token, and expiry', () => {
    const expiresAt = new Date('2026-06-28T13:00:00Z')
    const session = Session.create({
      user,
      accessToken: 'opaque-access-token',
      expiresAt,
    })

    expect(session.user).toBe(user)
    expect(session.accessToken).toBe('opaque-access-token')
    expect(session.expiresAt).toEqual(expiresAt)
  })

  it('rejects an empty access token', () => {
    expect(() =>
      Session.create({
        user,
        accessToken: '',
        expiresAt: new Date('2026-06-28T13:00:00Z'),
      }),
    ).toThrow()
  })

  it('is not expired when the current time is before expiresAt', () => {
    const session = Session.create({
      user,
      accessToken: 'token',
      expiresAt: new Date('2026-06-28T13:00:00Z'),
    })

    const now = new Date('2026-06-28T12:00:00Z')

    expect(session.isExpiredAt(now)).toBe(false)
  })

  it('is expired when the current time is after expiresAt', () => {
    const session = Session.create({
      user,
      accessToken: 'token',
      expiresAt: new Date('2026-06-28T13:00:00Z'),
    })

    const now = new Date('2026-06-28T14:00:00Z')

    expect(session.isExpiredAt(now)).toBe(true)
  })

  it('is expired exactly at the expiresAt instant', () => {
    const expiresAt = new Date('2026-06-28T13:00:00Z')
    const session = Session.create({
      user,
      accessToken: 'token',
      expiresAt,
    })

    expect(session.isExpiredAt(expiresAt)).toBe(true)
  })

  it('belongs to the same tenant as its user', () => {
    const session = Session.create({
      user,
      accessToken: 'token',
      expiresAt: new Date('2026-06-28T13:00:00Z'),
    })

    expect(session.belongsToTenant(tenant)).toBe(true)
  })
})
