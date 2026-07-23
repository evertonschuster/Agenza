import { describe, it, expect, vi } from 'vitest'
import { UpdateTag } from '@/features/catalog/application/use-cases/tags/UpdateTag'
import { createFakeTagRepository } from '@/features/catalog/application/test-helpers/createFakeTagRepository'
import { Tag } from '@/features/catalog/domain/entities/Tag'
import { Tenant } from '@/features/auth'
import { User } from '@/features/auth'
import type { TenantContext } from '@/features/auth'

function buildTenantContext(): TenantContext {
  const tenant = Tenant.create('tenant-123')
  return { tenant, user: User.create({ id: 'user-1', tenant }) }
}

describe('UpdateTag', () => {
  it('delegates to the tag repository with the tenant context, id, and input', async () => {
    const tenantContext = buildTenantContext()
    const updated = Tag.create({ id: 'tag-1', name: 'Renamed', color: '#ef4444' })
    const updateSpy = vi.fn(() => Promise.resolve(updated))
    const tagRepository = createFakeTagRepository({ update: updateSpy })
    const input = { name: 'Renamed', color: '#ef4444' }

    const result = await new UpdateTag(tagRepository).execute(tenantContext, 'tag-1', input)

    expect(updateSpy).toHaveBeenCalledExactlyOnceWith(tenantContext, 'tag-1', input)
    expect(result).toBe(updated)
  })
})
