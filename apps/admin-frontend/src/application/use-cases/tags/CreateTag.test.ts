import { describe, it, expect, vi } from 'vitest'
import { CreateTag } from './CreateTag'
import { createFakeTagRepository } from '../../test-helpers/createFakeTagRepository'
import { Tag } from '../../../domain/entities/Tag'
import { Tenant } from '../../../domain/value-objects/Tenant'
import { User } from '../../../domain/entities/User'
import type { TenantContext } from '../../context/TenantContext'

function buildTenantContext(): TenantContext {
  const tenant = Tenant.create('tenant-123')
  return { tenant, user: User.create({ id: 'user-1', tenant }) }
}

describe('CreateTag', () => {
  it('delegates to the tag repository with the tenant context and input', async () => {
    const tenantContext = buildTenantContext()
    const created = Tag.create({ id: 'tag-1', name: 'VIP', color: '#0d9488' })
    const createSpy = vi.fn(() => Promise.resolve(created))
    const tagRepository = createFakeTagRepository({ create: createSpy })
    const input = { name: 'VIP', color: '#0d9488' }

    const result = await new CreateTag(tagRepository).execute(tenantContext, input)

    expect(createSpy).toHaveBeenCalledExactlyOnceWith(tenantContext, input)
    expect(result).toBe(created)
  })
})
