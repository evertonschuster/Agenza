import { describe, it, expect, vi } from 'vitest'
import { CreateTag } from '@/features/catalog/application/use-cases/tags/CreateTag'
import { createFakeTagRepository } from '@/features/catalog/application/test-helpers/createFakeTagRepository'
import { Tag } from '@/features/catalog/domain/entities/Tag'
import { Tenant } from '@/features/auth'
import { User } from '@/features/auth'
import type { TenantContext } from '@/features/auth'

function buildTenantContext(): TenantContext {
  const tenant = Tenant.create('tenant-123')
  return { tenant, user: User.create({ id: 'user-1', tenant }) }
}

describe('CreateTag', () => {
  it('delegates to the tag repository with the tenant context and input', async () => {
    const tenantContext = buildTenantContext()
    const created = Tag.create({ id: 'tag-1', name: 'VIP', color: '#0d9488' })
    const createSpy = vi.fn(() => Promise.resolve(created))
    const tagRepository = createFakeTagRepository({ create: createSpy })
    const input = { name: 'VIP', color: '#0d9488' }

    const result = await new CreateTag(tagRepository).execute(tenantContext, input)

    expect(createSpy).toHaveBeenCalledExactlyOnceWith(tenantContext, input)
    expect(result).toBe(created)
  })
})
