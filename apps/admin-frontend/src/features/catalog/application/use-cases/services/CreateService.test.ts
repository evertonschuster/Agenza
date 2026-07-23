import { describe, it, expect, vi } from 'vitest'
import { CreateService } from '@/features/catalog/application/use-cases/services/CreateService'
import { createFakeServiceRepository } from '@/features/catalog/application/test-helpers/createFakeServiceRepository'
import { Service } from '@/features/catalog/domain/entities/Service'
import { Tenant } from '@/features/auth'
import { User } from '@/features/auth'
import type { TenantContext } from '@/features/auth'
import type { CreateServiceInput } from '@/features/catalog/application/repositories/ServiceRepository'

function buildTenantContext(): TenantContext {
  const tenant = Tenant.create('tenant-123')
  return { tenant, user: User.create({ id: 'user-1', tenant }) }
}

describe('CreateService', () => {
  it('delegates to the service repository with the tenant context and input', async () => {
    const tenantContext = buildTenantContext()
    const created = Service.create({
      id: 'service-1',
      code: 1001,
      name: 'Massagem relaxante',
      durationMinutes: 60,
      minDurationMinutes: 30,
      maxDurationMinutes: 90,
      price: 150,
      maxDiscountPercentage: 10,
      tags: [],
    })
    const createSpy = vi.fn(() => Promise.resolve(created))
    const serviceRepository = createFakeServiceRepository({ create: createSpy })
    const input: CreateServiceInput = {
      name: 'Massagem relaxante',
      durationMinutes: 60,
      minDurationMinutes: 30,
      maxDurationMinutes: 90,
      price: 150,
      maxDiscountPercentage: 10,
    }

    const result = await new CreateService(serviceRepository).execute(tenantContext, input)

    expect(createSpy).toHaveBeenCalledExactlyOnceWith(tenantContext, input)
    expect(result).toBe(created)
  })
})
