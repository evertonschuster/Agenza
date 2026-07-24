import { describe, it, expect, vi } from 'vitest'
import { ListCategories } from '@/features/catalog/application/use-cases/categories/ListCategories'
import { createFakeCategoryRepository } from '@/features/catalog/application/test-helpers/createFakeCategoryRepository'
import { Category } from '@/features/catalog/domain/entities/Category'
import { Tenant } from '@/features/auth'
import { User } from '@/features/auth'
import type { TenantContext } from '@/features/auth'

function buildTenantContext(): TenantContext {
  const tenant = Tenant.create('tenant-123')
  return { tenant, user: User.create({ id: 'user-1', tenant }) }
}

describe('ListCategories', () => {
  it('delegates to the category repository with the given tenant context', async () => {
    const tenantContext = buildTenantContext()
    const category = Category.create({ id: 'category-1', name: 'Massagens' })
    const listAllSpy = vi.fn(() => Promise.resolve([category]))
    const categoryRepository = createFakeCategoryRepository({ listAll: listAllSpy })

    const result = await new ListCategories(categoryRepository).execute(tenantContext)

    expect(listAllSpy).toHaveBeenCalledExactlyOnceWith(tenantContext, undefined)
    expect(result).toEqual([category])
  })
})
