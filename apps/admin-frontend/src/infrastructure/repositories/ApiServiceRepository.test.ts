import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/mocks/server'
import { ApiServiceRepository } from './ApiServiceRepository'
import { AuthenticatedHttpClient } from '../http/AuthenticatedHttpClient'
import { serviceFixture } from '../../test/mocks/handlers/serviceHandlers'
import { Tenant } from '../../domain/value-objects/Tenant'
import { User } from '../../domain/entities/User'
import type { TenantContext } from '../../application/context/TenantContext'
import type { CreateServiceInput } from '../../application/repositories/ServiceRepository'

const baseUrl = 'https://api.test'

function buildRepository(): ApiServiceRepository {
  const httpClient = new AuthenticatedHttpClient(
    baseUrl,
    () => Promise.resolve('token-123'),
    () => Promise.resolve('tenant-123'),
  )
  return new ApiServiceRepository(httpClient)
}

function buildTenantContext(): TenantContext {
  const tenant = Tenant.create('tenant-123')
  return { tenant, user: User.create({ id: 'user-1', tenant }) }
}

const createInput: CreateServiceInput = {
  name: 'Massagem relaxante',
  durationMinutes: 60,
  minDurationMinutes: 30,
  maxDurationMinutes: 90,
  price: 150,
  maxDiscountPercentage: 10,
}

describe('ApiServiceRepository', () => {
  it('lists services mapped to domain entities', async () => {
    const repository = buildRepository()

    const result = await repository.listAll(buildTenantContext())

    expect(result.services).toHaveLength(1)
    expect(result.services[0]?.id).toBe(serviceFixture.id)
    expect(result.services[0]?.name).toBe(serviceFixture.name)
    expect(result.totalCount).toBe(1)
    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(20)
  })

  it('sends the requested page and pageSize as query params', async () => {
    let capturedUrl: URL | undefined
    server.use(
      http.get(`${baseUrl}/api/v1/services`, ({ request }) => {
        capturedUrl = new URL(request.url)
        return HttpResponse.json({ items: [serviceFixture], totalCount: 1, page: 2, pageSize: 5 })
      }),
    )
    const repository = buildRepository()

    const result = await repository.listAll(buildTenantContext(), { page: 2, pageSize: 5 })

    expect(capturedUrl?.searchParams.get('page')).toBe('2')
    expect(capturedUrl?.searchParams.get('pageSize')).toBe('5')
    expect(result.page).toBe(2)
    expect(result.pageSize).toBe(5)
  })

  it('creates a service and returns the mapped result', async () => {
    server.use(
      http.post(`${baseUrl}/api/v1/services`, async ({ request }) => {
        expect(await request.json()).toEqual(createInput)
        return HttpResponse.json(serviceFixture, { status: 201 })
      }),
    )
    const repository = buildRepository()

    const service = await repository.create(buildTenantContext(), createInput)

    expect(service.id).toBe(serviceFixture.id)
  })

  it('updates a service at the correct path', async () => {
    server.use(
      http.put(`${baseUrl}/api/v1/services/service-1`, async ({ request }) => {
        expect(await request.json()).toEqual({ ...createInput, name: 'Renamed' })
        return HttpResponse.json({ ...serviceFixture, name: 'Renamed' })
      }),
    )
    const repository = buildRepository()

    const service = await repository.update(buildTenantContext(), 'service-1', {
      ...createInput,
      name: 'Renamed',
    })

    expect(service.name).toBe('Renamed')
  })

  it('deletes a service at the correct path', async () => {
    let deleteWasCalled = false
    server.use(
      http.delete(`${baseUrl}/api/v1/services/service-1`, () => {
        deleteWasCalled = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const repository = buildRepository()

    await repository.delete(buildTenantContext(), 'service-1')

    expect(deleteWasCalled).toBe(true)
  })

  it('propagates ApiError from the HttpClient on a non-2xx response', async () => {
    server.use(
      http.get(`${baseUrl}/api/v1/services`, () =>
        HttpResponse.json({ title: 'Something went wrong' }, { status: 500 }),
      ),
    )
    const repository = buildRepository()

    await expect(repository.listAll(buildTenantContext())).rejects.toThrow('Something went wrong')
  })
})
