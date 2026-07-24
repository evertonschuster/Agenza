import { describe, it, expect, vi } from 'vitest'
import { DeleteCategory } from '@/features/catalog/application/use-cases/categories/DeleteCategory'
import { createFakeCategoryRepository } from '@/features/catalog/application/test-helpers/createFakeCategoryRepository'
import { Tenant } from '@/features/auth'
import { User } from '@/features/auth'
import type { TenantContext } from '@/features/auth'

function buildTenantContext(): TenantContext {
  const tenant = Tenant.create('tenant-123')
  return { tenant, user: User.create({ id: 'user-1', tenant }) }
}

describe('DeleteCategory', () => {
  it('delegates to the category repository with the tenant context and id', async () => {
    const tenantContext = buildTenantContext()
    const deleteSpy = vi.fn(() => Promise.resolve())
    const categoryRepository = createFakeCategoryRepository({ delete: deleteSpy })

    await new DeleteCategory(categoryRepository).execute(tenantContext, 'category-1')

    expect(deleteSpy).toHaveBeenCalledExactlyOnceWith(tenantContext, 'category-1')
  })
})
