import { describe, it, expect, vi } from 'vitest'
import { DeleteCategory } from './DeleteCategory'
import { createFakeCategoryRepository } from '../../test-helpers/createFakeCategoryRepository'
import { Tenant } from '../../../domain/value-objects/Tenant'
import { User } from '../../../domain/entities/User'
import type { TenantContext } from '../../context/TenantContext'

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
