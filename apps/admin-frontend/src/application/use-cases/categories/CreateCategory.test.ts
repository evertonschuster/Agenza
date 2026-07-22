import { describe, it, expect, vi } from 'vitest'
import { CreateCategory } from './CreateCategory'
import { createFakeCategoryRepository } from '../../test-helpers/createFakeCategoryRepository'
import { Category } from '../../../domain/entities/Category'
import { Tenant } from '../../../domain/value-objects/Tenant'
import { User } from '../../../domain/entities/User'
import type { TenantContext } from '../../context/TenantContext'

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
