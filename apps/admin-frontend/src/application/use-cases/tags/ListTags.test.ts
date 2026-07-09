import { describe, it, expect, vi } from 'vitest'
import { ListTags } from './ListTags'
import { createFakeTagRepository } from '../../test-helpers/createFakeTagRepository'
import { Tag } from '../../../domain/entities/Tag'
import { Tenant } from '../../../domain/value-objects/Tenant'
import { User } from '../../../domain/entities/User'
import type { TenantContext } from '../../context/TenantContext'

function buildTenantContext(): TenantContext {
  const tenant = Tenant.create('tenant-123')
  return { tenant, user: User.create({ id: 'user-1', tenant }) }
}

describe('ListTags', () => {
  it('delegates to the tag repository with the given tenant context', async () => {
    const tenantContext = buildTenantContext()
    const tag = Tag.create({ id: 'tag-1', name: 'VIP', color: '#0d9488' })
    const listAllSpy = vi.fn(() => Promise.resolve([tag]))
    const tagRepository = createFakeTagRepository({ listAll: listAllSpy })

    const result = await new ListTags(tagRepository).execute(tenantContext)

    expect(listAllSpy).toHaveBeenCalledExactlyOnceWith(tenantContext)
    expect(result).toEqual([tag])
  })
})
