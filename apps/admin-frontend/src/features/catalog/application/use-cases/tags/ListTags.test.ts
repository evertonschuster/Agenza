import { describe, it, expect, vi } from 'vitest'
import { ListTags } from '@/features/catalog/application/use-cases/tags/ListTags'
import { createFakeTagRepository } from '@/features/catalog/application/test-helpers/createFakeTagRepository'
import { Tag } from '@/features/catalog/domain/entities/Tag'
import { Tenant } from '@/features/auth'
import { User } from '@/features/auth'
import type { TenantContext } from '@/features/auth'

function buildTenantContext(): TenantContext {
  const tenant = Tenant.create('tenant-123')
  return { tenant, user: User.create({ id: 'user-1', tenant }) }
}

describe('ListTags', () => {
  it('delegates to the tag repository with the given tenant context', async () => {
    const tenantContext = buildTenantContext()
    const tag = Tag.create({ id: 'tag-1', name: 'VIP', color: '#0d9488' })
    const listAllSpy = vi.fn(() => Promise.resolve([tag]))
    const tagRepository = createFakeTagRepository({ listAll: listAllSpy })

    const result = await new ListTags(tagRepository).execute(tenantContext)

    expect(listAllSpy).toHaveBeenCalledExactlyOnceWith(tenantContext, undefined)
    expect(result).toEqual([tag])
  })
})
