import { describe, it, expect } from 'vitest'
import { User } from '@/features/auth/domain/entities/User'
import { Tenant } from '@/features/auth/domain/value-objects/Tenant'

describe('User', () => {
  const tenant = Tenant.create('tenant-123')

  it('creates a user with the required id and tenant', () => {
    const user = User.create({ id: 'user-1', tenant })

    expect(user.id).toBe('user-1')
    expect(user.tenant.equals(tenant)).toBe(true)
  })

  it('creates a user with optional email and name when provided', () => {
    const user = User.create({
      id: 'user-1',
      tenant,
      email: 'owner@clinic.com',
      name: 'Dr. Owner',
    })

    expect(user.email).toBe('owner@clinic.com')
    expect(user.name).toBe('Dr. Owner')
  })

  it('creates a user without email or name when not provided', () => {
    const user = User.create({ id: 'user-1', tenant })

    expect(user.email).toBeUndefined()
    expect(user.name).toBeUndefined()
  })

  it('rejects an empty user id', () => {
    expect(() => User.create({ id: '', tenant })).toThrow()
  })

  it('belongsToTenant returns true for the same tenant', () => {
    const user = User.create({ id: 'user-1', tenant })

    expect(user.belongsToTenant(tenant)).toBe(true)
  })

  it('belongsToTenant returns false for a different tenant', () => {
    const user = User.create({ id: 'user-1', tenant })
    const otherTenant = Tenant.create('tenant-456')

    expect(user.belongsToTenant(otherTenant)).toBe(false)
  })
})
