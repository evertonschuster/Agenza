import { describe, it, expect, vi } from 'vitest'
import { ListServices } from './ListServices'
import { createFakeServiceRepository } from '../../test-helpers/createFakeServiceRepository'
import { Service } from '../../../domain/entities/Service'
import { Tenant } from '../../../domain/value-objects/Tenant'
import { User } from '../../../domain/entities/User'
import type { TenantContext } from '../../context/TenantContext'

function buildTenantContext(): TenantContext {
  const tenant = Tenant.create('tenant-123')
  return { tenant, user: User.create({ id: 'user-1', tenant }) }
}

function buildService(): Service {
  return Service.create({
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
}

describe('ListServices', () => {
  it('delegates to the service repository with the given tenant context and options', async () => {
    const tenantContext = buildTenantContext()
    const service = buildService()
    const pagedResult = { services: [service], totalCount: 1, page: 1, pageSize: 20 }
    const listAllSpy = vi.fn(() => Promise.resolve(pagedResult))
    const serviceRepository = createFakeServiceRepository({ listAll: listAllSpy })

    const result = await new ListServices(serviceRepository).execute(tenantContext, {
      page: 1,
      pageSize: 20,
    })

    expect(listAllSpy).toHaveBeenCalledExactlyOnceWith(tenantContext, { page: 1, pageSize: 20 })
    expect(result).toEqual(pagedResult)
  })
})
