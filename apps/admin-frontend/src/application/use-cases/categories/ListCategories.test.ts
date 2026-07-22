import { describe, it, expect, vi } from 'vitest'
import { ListCategories } from './ListCategories'
import { createFakeCategoryRepository } from '../../test-helpers/createFakeCategoryRepository'
import { Category } from '../../../domain/entities/Category'
import { Tenant } from '../../../domain/value-objects/Tenant'
import { User } from '../../../domain/entities/User'
import type { TenantContext } from '../../context/TenantContext'

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
