import { describe, it, expect, vi } from 'vitest'
import { DeleteTag } from '@/features/catalog/application/use-cases/tags/DeleteTag'
import { createFakeTagRepository } from '@/features/catalog/application/test-helpers/createFakeTagRepository'
import { Tenant } from '@/features/auth'
import { User } from '@/features/auth'
import type { TenantContext } from '@/features/auth'

function buildTenantContext(): TenantContext {
  const tenant = Tenant.create('tenant-123')
  return { tenant, user: User.create({ id: 'user-1', tenant }) }
}

describe('DeleteTag', () => {
  it('delegates to the tag repository with the tenant context and id', async () => {
    const tenantContext = buildTenantContext()
    const deleteSpy = vi.fn(() => Promise.resolve())
    const tagRepository = createFakeTagRepository({ delete: deleteSpy })

    await new DeleteTag(tagRepository).execute(tenantContext, 'tag-1')

    expect(deleteSpy).toHaveBeenCalledExactlyOnceWith(tenantContext, 'tag-1')
  })
})
