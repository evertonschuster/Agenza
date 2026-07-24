import { describe, it, expect, vi } from 'vitest'
import { CreateCategory } from '@/features/catalog/application/use-cases/categories/CreateCategory'
import { createFakeCategoryRepository } from '@/features/catalog/application/test-helpers/createFakeCategoryRepository'
import { Category } from '@/features/catalog/domain/entities/Category'
import { Tenant } from '@/features/auth'
import { User } from '@/features/auth'
import type { TenantContext } from '@/features/auth'

function buildTenantContext(): TenantContext {
  const tenant = Tenant.create('tenant-123')
  return { tenant, user: User.create({ id: 'user-1', tenant }) }
}

describe('CreateCategory', () => {
  it('delegates to the category repository with the tenant context and input', async () => {
    const tenantContext = buildTenantContext()
    const created = Category.create({ id: 'category-1', name: 'Massagens' })
    const createSpy = vi.fn(() => Promise.resolve(created))
    const categoryRepository = createFakeCategoryRepository({ create: createSpy })
    const input = { name: 'Massagens' }

    const result = await new CreateCategory(categoryRepository).execute(tenantContext, input)

    expect(createSpy).toHaveBeenCalledExactlyOnceWith(tenantContext, input)
    expect(result).toBe(created)
  })
})
