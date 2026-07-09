import { describe, it, expect, vi } from 'vitest'
import { UpdateTag } from './UpdateTag'
import { createFakeTagRepository } from '../../test-helpers/createFakeTagRepository'
import { Tag } from '../../../domain/entities/Tag'
import { Tenant } from '../../../domain/value-objects/Tenant'
import { User } from '../../../domain/entities/User'
import type { TenantContext } from '../../context/TenantContext'

function buildTenantContext(): TenantContext {
  const tenant = Tenant.create('tenant-123')
  return { tenant, user: User.create({ id: 'user-1', tenant }) }
}

describe('UpdateTag', () => {
  it('delegates to the tag repository with the tenant context, id, and input', async () => {
    const tenantContext = buildTenantContext()
    const updated = Tag.create({ id: 'tag-1', name: 'Renamed', color: '#ef4444' })
    const updateSpy = vi.fn(() => Promise.resolve(updated))
    const tagRepository = createFakeTagRepository({ update: updateSpy })
    const input = { name: 'Renamed', color: '#ef4444' }

    const result = await new UpdateTag(tagRepository).execute(tenantContext, 'tag-1', input)

    expect(updateSpy).toHaveBeenCalledExactlyOnceWith(tenantContext, 'tag-1', input)
    expect(result).toBe(updated)
  })
})
