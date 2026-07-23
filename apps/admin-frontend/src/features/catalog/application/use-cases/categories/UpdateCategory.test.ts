import { describe, it, expect, vi } from 'vitest'
import { UpdateCategory } from '@/features/catalog/application/use-cases/categories/UpdateCategory'
import { createFakeCategoryRepository } from '@/features/catalog/application/test-helpers/createFakeCategoryRepository'
import { Category } from '@/features/catalog/domain/entities/Category'
import { Tenant } from '@/features/auth'
import { User } from '@/features/auth'
import type { TenantContext } from '@/features/auth'

function buildTenantContext(): TenantContext {
  const tenant = Tenant.create('tenant-123')
  return { tenant, user: User.create({ id: 'user-1', tenant }) }
}

describe('UpdateCategory', () => {
  it('delegates to the category repository with the tenant context, id, and input', async () => {
    const tenantContext = buildTenantContext()
    const updated = Category.create({ id: 'category-1', name: 'Renamed' })
    const updateSpy = vi.fn(() => Promise.resolve(updated))
    const categoryRepository = createFakeCategoryRepository({ update: updateSpy })
    const input = { name: 'Renamed' }

    const result = await new UpdateCategory(categoryRepository).execute(
      tenantContext,
      'category-1',
      input,
    )

    expect(updateSpy).toHaveBeenCalledExactlyOnceWith(tenantContext, 'category-1', input)
    expect(result).toBe(updated)
  })
})
