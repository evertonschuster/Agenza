import { describe, it, expect, vi } from 'vitest'
import { UpdateService } from '@/features/catalog/application/use-cases/services/UpdateService'
import { createFakeServiceRepository } from '@/features/catalog/application/test-helpers/createFakeServiceRepository'
import { Service } from '@/features/catalog/domain/entities/Service'
import { Tenant } from '@/features/auth'
import { User } from '@/features/auth'
import type { TenantContext } from '@/features/auth'
import type { UpdateServiceInput } from '@/features/catalog/application/repositories/ServiceRepository'

function buildTenantContext(): TenantContext {
  const tenant = Tenant.create('tenant-123')
  return { tenant, user: User.create({ id: 'user-1', tenant }) }
}

describe('UpdateService', () => {
  it('delegates to the service repository with the tenant context, id, and input', async () => {
    const tenantContext = buildTenantContext()
    const updated = Service.create({
      id: 'service-1',
      code: 1001,
      name: 'Renamed',
      durationMinutes: 45,
      minDurationMinutes: 30,
      maxDurationMinutes: 60,
      price: 200,
      maxDiscountPercentage: 5,
      tags: [],
    })
    const updateSpy = vi.fn(() => Promise.resolve(updated))
    const serviceRepository = createFakeServiceRepository({ update: updateSpy })
    const input: UpdateServiceInput = {
      name: 'Renamed',
      durationMinutes: 45,
      minDurationMinutes: 30,
      maxDurationMinutes: 60,
      price: 200,
      maxDiscountPercentage: 5,
    }

    const result = await new UpdateService(serviceRepository).execute(
      tenantContext,
      'service-1',
      input,
    )

    expect(updateSpy).toHaveBeenCalledExactlyOnceWith(tenantContext, 'service-1', input)
    expect(result).toBe(updated)
  })
})
