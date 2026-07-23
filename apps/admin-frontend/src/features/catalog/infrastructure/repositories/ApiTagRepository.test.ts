import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { ApiTagRepository } from '@/features/catalog/infrastructure/repositories/ApiTagRepository'
import { AuthenticatedHttpClient } from '@/shared/infrastructure/http/AuthenticatedHttpClient'
import { tagFixture } from '@/test/mocks/handlers/tagHandlers'
import { Tenant } from '@/features/auth'
import { User } from '@/features/auth'
import type { TenantContext } from '@/features/auth'

const baseUrl = 'https://api.test'

function buildRepository(): ApiTagRepository {
  const httpClient = new AuthenticatedHttpClient(baseUrl, () =>
    Promise.resolve({ accessToken: 'token-123', tenantId: 'tenant-123' }),
  )
  return new ApiTagRepository(httpClient)
}

function buildTenantContext(): TenantContext {
  const tenant = Tenant.create('tenant-123')
  return { tenant, user: User.create({ id: 'user-1', tenant }) }
}

describe('ApiTagRepository', () => {
  it('lists tags mapped to domain entities', async () => {
    const repository = buildRepository()

    const tags = await repository.listAll(buildTenantContext())

    expect(tags).toHaveLength(1)
    expect(tags[0]?.id).toBe(tagFixture.id)
    expect(tags[0]?.name).toBe(tagFixture.name)
  })

  it('sends the search term as a query parameter', async () => {
    server.use(
      http.get(`${baseUrl}/api/v1/tags`, ({ request }) => {
        expect(new URL(request.url).searchParams.get('search')).toBe('vip')
        return HttpResponse.json([tagFixture])
      }),
    )
    const repository = buildRepository()

    await repository.listAll(buildTenantContext(), { search: 'vip' })
  })

  it('creates a tag, sending an omitted description as explicit null', async () => {
    server.use(
      http.post(`${baseUrl}/api/v1/tags`, async ({ request }) => {
        // CreateTagCommand marks description required-but-nullable in the
        // OpenAPI schema, not optional - an absent app-side description
        // must still be sent as an explicit `null` key, not omitted.
        expect(await request.json()).toEqual({
          name: 'VIP',
          color: '#0d9488',
          description: null,
        })
        return HttpResponse.json(tagFixture, { status: 201 })
      }),
    )
    const repository = buildRepository()

    const tag = await repository.create(buildTenantContext(), { name: 'VIP', color: '#0d9488' })

    expect(tag.id).toBe(tagFixture.id)
  })

  it('creates a tag, sending a provided description as-is', async () => {
    server.use(
      http.post(`${baseUrl}/api/v1/tags`, async ({ request }) => {
        expect(await request.json()).toEqual({
          name: 'VIP',
          color: '#0d9488',
          description: 'High-value returning client',
        })
        return HttpResponse.json(tagFixture, { status: 201 })
      }),
    )
    const repository = buildRepository()

    await repository.create(buildTenantContext(), {
      name: 'VIP',
      color: '#0d9488',
      description: 'High-value returning client',
    })
  })

  it('updates a tag at the correct path', async () => {
    server.use(
      http.put(`${baseUrl}/api/v1/tags/tag-1`, async ({ request }) => {
        // tagId mirrors the route id explicitly (docs/adr/010) - the
        // backend overwrites it regardless, but the two must never
        // structurally be able to diverge.
        expect(await request.json()).toEqual({
          tagId: 'tag-1',
          name: 'Renamed',
          color: '#ef4444',
          description: null,
        })
        return HttpResponse.json({ ...tagFixture, name: 'Renamed', color: '#ef4444' })
      }),
    )
    const repository = buildRepository()

    const tag = await repository.update(buildTenantContext(), 'tag-1', {
      name: 'Renamed',
      color: '#ef4444',
    })

    expect(tag.name).toBe('Renamed')
  })

  it('deletes a tag at the correct path', async () => {
    let deleteWasCalled = false
    server.use(
      http.delete(`${baseUrl}/api/v1/tags/tag-1`, () => {
        deleteWasCalled = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const repository = buildRepository()

    await repository.delete(buildTenantContext(), 'tag-1')

    expect(deleteWasCalled).toBe(true)
  })

  it('propagates a curated AppError from the HttpClient on a non-2xx response, not the raw backend title', async () => {
    server.use(
      http.get(`${baseUrl}/api/v1/tags`, () =>
        HttpResponse.json({ title: 'Something went wrong' }, { status: 500 }),
      ),
    )
    const repository = buildRepository()

    await expect(repository.listAll(buildTenantContext())).rejects.toThrow(
      'Não foi possível concluir a operação. Tente novamente.',
    )
  })
})
