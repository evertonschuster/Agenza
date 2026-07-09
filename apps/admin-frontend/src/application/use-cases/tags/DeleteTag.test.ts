import { describe, it, expect, vi } from 'vitest'
import { DeleteTag } from './DeleteTag'
import { createFakeTagRepository } from '../../test-helpers/createFakeTagRepository'
import { Tenant } from '../../../domain/value-objects/Tenant'
import { User } from '../../../domain/entities/User'
import type { TenantContext } from '../../context/TenantContext'

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
