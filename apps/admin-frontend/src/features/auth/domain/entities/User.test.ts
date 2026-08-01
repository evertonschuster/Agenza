import { describe, it, expect } from 'vitest'
import { User } from '@/features/auth/domain/entities/User'
import { Tenant } from '@/features/auth/domain/value-objects/Tenant'
import { InvalidUserError } from '@/features/auth/domain/errors/InvalidUserError'
import { unwrapResult } from '@/test/fixtures/unwrapResult'

describe('User', () => {
  const tenant = unwrapResult(Tenant.create('tenant-123'))

  it('creates a user with the required id and tenant', () => {
    const result = User.create({ id: 'user-1', tenant })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.value.id).toBe('user-1')
    expect(result.value.tenant.equals(tenant)).toBe(true)
  })

  it('creates a user with optional email and name when provided', () => {
    const result = User.create({
      id: 'user-1',
      tenant,
      email: 'owner@clinic.com',
      name: 'Dr. Owner',
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.value.email).toBe('owner@clinic.com')
    expect(result.value.name).toBe('Dr. Owner')
  })

  it('creates a user without email or name when not provided', () => {
    const result = User.create({ id: 'user-1', tenant })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.value.email).toBeUndefined()
    expect(result.value.name).toBeUndefined()
  })

  it('fails for an empty user id', () => {
    const result = User.create({ id: '', tenant })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toBeInstanceOf(InvalidUserError)
  })

  it('belongsToTenant returns true for the same tenant', () => {
    const user = unwrapResult(User.create({ id: 'user-1', tenant }))

    expect(user.belongsToTenant(tenant)).toBe(true)
  })

  it('belongsToTenant returns false for a different tenant', () => {
    const user = unwrapResult(User.create({ id: 'user-1', tenant }))
    const otherTenant = unwrapResult(Tenant.create('tenant-456'))

    expect(user.belongsToTenant(otherTenant)).toBe(false)
  })
})
