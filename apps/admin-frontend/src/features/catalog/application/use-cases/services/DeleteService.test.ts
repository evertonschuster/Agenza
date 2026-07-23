import { describe, it, expect, vi } from 'vitest'
import { DeleteService } from '@/features/catalog/application/use-cases/services/DeleteService'
import { createFakeServiceRepository } from '@/features/catalog/application/test-helpers/createFakeServiceRepository'
import { Tenant } from '@/features/auth'
import { User } from '@/features/auth'
import type { TenantContext } from '@/features/auth'

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
