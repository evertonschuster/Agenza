import { describe, it, expect, vi } from 'vitest'
import { DeleteService } from './DeleteService'
import { createFakeServiceRepository } from '../../test-helpers/createFakeServiceRepository'
import { Tenant } from '../../../domain/value-objects/Tenant'
import { User } from '../../../domain/entities/User'
import type { TenantContext } from '../../context/TenantContext'

function buildTenantContext(): TenantContext {
  const tenant = Tenant.create('tenant-123')
  return { tenant, user: User.create({ id: 'user-1', tenant }) }
}

describe('DeleteService', () => {
  it('delegates to the service repository with the tenant context and id', async () => {
    const tenantContext = buildTenantContext()
    const deleteSpy = vi.fn(() => Promise.resolve())
    const serviceRepository = createFakeServiceRepository({ delete: deleteSpy })

    await new DeleteService(serviceRepository).execute(tenantContext, 'service-1')

    expect(deleteSpy).toHaveBeenCalledExactlyOnceWith(tenantContext, 'service-1')
  })
})
