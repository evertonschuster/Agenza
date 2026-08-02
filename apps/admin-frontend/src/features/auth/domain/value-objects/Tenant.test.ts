import { describe, it, expect } from 'vitest'
import { Tenant } from '@/features/auth/domain/value-objects/Tenant'
import { InvalidTenantError } from '@/features/auth/domain/errors/InvalidTenantError'
import { unwrapResult } from '@/test/fixtures/unwrapResult'

describe('Tenant', () => {
  it('creates a tenant from a valid non-empty id', () => {
    const result = Tenant.create('tenant-123')

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.value.id).toBe('tenant-123')
  })

  it('fails for an empty tenant id', () => {
    const result = Tenant.create('')

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toBeInstanceOf(InvalidTenantError)
  })

  it('fails for a tenant id that is only whitespace', () => {
    const result = Tenant.create('   ')

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toBeInstanceOf(InvalidTenantError)
  })

  it('considers two tenants with the same id equal', () => {
    const tenantA = unwrapResult(Tenant.create('tenant-123'))
    const tenantB = unwrapResult(Tenant.create('tenant-123'))

    expect(tenantA.equals(tenantB)).toBe(true)
  })

  it('considers two tenants with different ids not equal', () => {
    const tenantA = unwrapResult(Tenant.create('tenant-123'))
    const tenantB = unwrapResult(Tenant.create('tenant-456'))

    expect(tenantA.equals(tenantB)).toBe(false)
  })
})
