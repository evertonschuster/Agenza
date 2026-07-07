import { describe, it, expect } from 'vitest'
import { Tenant } from './Tenant'

describe('Tenant', () => {
  it('creates a tenant from a valid non-empty id', () => {
    const tenant = Tenant.create('tenant-123')

    expect(tenant.id).toBe('tenant-123')
  })

  it('rejects an empty tenant id', () => {
    expect(() => Tenant.create('')).toThrow()
  })

  it('rejects a tenant id that is only whitespace', () => {
    expect(() => Tenant.create('   ')).toThrow()
  })

  it('considers two tenants with the same id equal', () => {
    const tenantA = Tenant.create('tenant-123')
    const tenantB = Tenant.create('tenant-123')

    expect(tenantA.equals(tenantB)).toBe(true)
  })

  it('considers two tenants with different ids not equal', () => {
    const tenantA = Tenant.create('tenant-123')
    const tenantB = Tenant.create('tenant-456')

    expect(tenantA.equals(tenantB)).toBe(false)
  })
})
