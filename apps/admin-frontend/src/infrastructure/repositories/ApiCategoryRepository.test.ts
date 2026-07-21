import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/mocks/server'
import { ApiCategoryRepository } from './ApiCategoryRepository'
import { AuthenticatedHttpClient } from '../http/AuthenticatedHttpClient'
import { categoryFixture } from '../../test/mocks/handlers/categoryHandlers'
import { Tenant } from '../../domain/value-objects/Tenant'
import { User } from '../../domain/entities/User'
import type { TenantContext } from '../../application/context/TenantContext'

const baseUrl = 'https://api.test'

function buildRepository(): ApiCategoryRepository {
  const httpClient = new AuthenticatedHttpClient(
    baseUrl,
    () => Promise.resolve('token-123'),
    () => Promise.resolve('tenant-123'),
  )
  return new ApiCategoryRepository(httpClient)
}

function buildTenantContext(): TenantContext {
  const tenant = Tenant.create('tenant-123')
  return { tenant, user: User.create({ id: 'user-1', tenant }) }
}

describe('ApiCategoryRepository', () => {
  it('lists categories mapped to domain entities', async () => {
    const repository = buildRepository()

    const categories = await repository.listAll(buildTenantContext())

    expect(categories).toHaveLength(1)
    expect(categories[0]?.id).toBe(categoryFixture.id)
    expect(categories[0]?.name).toBe(categoryFixture.name)
  })

  it('sends the search term as a query parameter', async () => {
    server.use(
      http.get(`${baseUrl}/api/v1/categories`, ({ request }) => {
        expect(new URL(request.url).searchParams.get('search')).toBe('massa')
        return HttpResponse.json([categoryFixture])
      }),
    )
    const repository = buildRepository()

    await repository.listAll(buildTenantContext(), { search: 'massa' })
  })

  it('omits the search query parameter when the search term is blank', async () => {
    server.use(
      http.get(`${baseUrl}/api/v1/categories`, ({ request }) => {
        expect(new URL(request.url).searchParams.has('search')).toBe(false)
        return HttpResponse.json([categoryFixture])
      }),
    )
    const repository = buildRepository()

    await repository.listAll(buildTenantContext(), { search: '   ' })
  })

  it('creates a category and returns the mapped result', async () => {
    server.use(
      http.post(`${baseUrl}/api/v1/categories`, async ({ request }) => {
        expect(await request.json()).toEqual({ name: 'Massagens' })
        return HttpResponse.json(categoryFixture, { status: 201 })
      }),
    )
    const repository = buildRepository()

    const category = await repository.create(buildTenantContext(), { name: 'Massagens' })

    expect(category.id).toBe(categoryFixture.id)
  })

  it('updates a category at the correct path', async () => {
    server.use(
      http.put(`${baseUrl}/api/v1/categories/category-1`, async ({ request }) => {
        expect(await request.json()).toEqual({ name: 'Renamed' })
        return HttpResponse.json({ ...categoryFixture, name: 'Renamed' })
      }),
    )
    const repository = buildRepository()

    const category = await repository.update(buildTenantContext(), 'category-1', {
      name: 'Renamed',
    })

    expect(category.name).toBe('Renamed')
  })

  it('deletes a category at the correct path', async () => {
    let deleteWasCalled = false
    server.use(
      http.delete(`${baseUrl}/api/v1/categories/category-1`, () => {
        deleteWasCalled = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const repository = buildRepository()

    await repository.delete(buildTenantContext(), 'category-1')

    expect(deleteWasCalled).toBe(true)
  })

  it('propagates ApiError from the HttpClient on a non-2xx response', async () => {
    server.use(
      http.get(`${baseUrl}/api/v1/categories`, () =>
        HttpResponse.json({ title: 'Something went wrong' }, { status: 500 }),
      ),
    )
    const repository = buildRepository()

    await expect(repository.listAll(buildTenantContext())).rejects.toThrow('Something went wrong')
  })
})
