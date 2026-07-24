import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { ApiServiceRepository } from '@/features/catalog/infrastructure/repositories/ApiServiceRepository'
import { AuthenticatedHttpClient } from '@/shared/infrastructure/http/AuthenticatedHttpClient'
import { serviceFixture } from '@/test/mocks/handlers/serviceHandlers'
import { Tenant } from '@/features/auth'
import { User } from '@/features/auth'
import type { TenantContext } from '@/features/auth'
import type { CreateServiceInput } from '@/features/catalog/application/repositories/ServiceRepository'

const baseUrl = 'https://api.test'

function buildRepository(): ApiServiceRepository {
  const httpClient = new AuthenticatedHttpClient(baseUrl, () =>
    Promise.resolve({ accessToken: 'token-123', tenantId: 'tenant-123' }),
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

  it('sends search, categoryId, and tagId as query params when provided', async () => {
    let capturedUrl: URL | undefined
    server.use(
      http.get(`${baseUrl}/api/v1/services`, ({ request }) => {
        capturedUrl = new URL(request.url)
        return HttpResponse.json({ items: [serviceFixture], totalCount: 1, page: 1, pageSize: 20 })
      }),
    )
    const repository = buildRepository()

    await repository.listAll(buildTenantContext(), {
      search: 'corte',
      categoryId: 'category-1',
      tagId: 'tag-1',
    })

    expect(capturedUrl?.searchParams.get('search')).toBe('corte')
    expect(capturedUrl?.searchParams.get('categoryId')).toBe('category-1')
    expect(capturedUrl?.searchParams.get('tagId')).toBe('tag-1')
  })

  it('omits search, categoryId, and tagId query params when not provided', async () => {
    let capturedUrl: URL | undefined
    server.use(
      http.get(`${baseUrl}/api/v1/services`, ({ request }) => {
        capturedUrl = new URL(request.url)
        return HttpResponse.json({ items: [serviceFixture], totalCount: 1, page: 1, pageSize: 20 })
      }),
    )
    const repository = buildRepository()

    await repository.listAll(buildTenantContext())

    expect(capturedUrl?.searchParams.has('search')).toBe(false)
    expect(capturedUrl?.searchParams.has('categoryId')).toBe(false)
    expect(capturedUrl?.searchParams.has('tagId')).toBe(false)
  })

  it('creates a service, sending omitted description/categoryId/tagIds as explicit null', async () => {
    server.use(
      http.post(`${baseUrl}/api/v1/services`, async ({ request }) => {
        // CreateServiceCommand marks these fields required-but-nullable in
        // the OpenAPI schema, not optional - an absent app-side value must
        // still be sent as an explicit `null` key, not omitted.
        expect(await request.json()).toEqual({
          ...createInput,
          description: null,
          categoryId: null,
          tagIds: null,
        })
        return HttpResponse.json(serviceFixture, { status: 201 })
      }),
    )
    const repository = buildRepository()

    const service = await repository.create(buildTenantContext(), createInput)

    expect(service.id).toBe(serviceFixture.id)
  })

  it('creates a service, sending provided description/categoryId/tagIds as-is', async () => {
    server.use(
      http.post(`${baseUrl}/api/v1/services`, async ({ request }) => {
        expect(await request.json()).toEqual({
          ...createInput,
          description: 'Uma massagem relaxante de corpo inteiro',
          categoryId: 'category-1',
          tagIds: ['tag-1'],
        })
        return HttpResponse.json(serviceFixture, { status: 201 })
      }),
    )
    const repository = buildRepository()

    await repository.create(buildTenantContext(), {
      ...createInput,
      description: 'Uma massagem relaxante de corpo inteiro',
      categoryId: 'category-1',
      tagIds: ['tag-1'],
    })
  })

  it('updates a service at the correct path', async () => {
    server.use(
      http.put(`${baseUrl}/api/v1/services/service-1`, async ({ request }) => {
        // serviceId mirrors the route id explicitly (docs/adr/010) - the
        // backend overwrites it regardless, but the two must never
        // structurally be able to diverge. Optional fields the input
        // omitted are sent as explicit null, matching the OpenAPI schema
        // (`null | string`, not optional) rather than omitting the key.
        expect(await request.json()).toEqual({
          ...createInput,
          serviceId: 'service-1',
          name: 'Renamed',
          description: null,
          categoryId: null,
          tagIds: null,
        })
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

  it('propagates a curated AppError from the HttpClient on a non-2xx response, not the raw backend title', async () => {
    server.use(
      http.get(`${baseUrl}/api/v1/services`, () =>
        HttpResponse.json({ title: 'Something went wrong' }, { status: 500 }),
      ),
    )
    const repository = buildRepository()

    await expect(repository.listAll(buildTenantContext())).rejects.toThrow(
      'Não foi possível concluir a operação. Tente novamente.',
    )
  })
})
