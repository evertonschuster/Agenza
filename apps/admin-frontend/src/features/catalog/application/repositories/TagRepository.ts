import type { Tag } from '@/features/catalog/domain/entities/Tag'
import type { TenantContext } from '@/features/auth'

export interface CreateTagInput {
  name: string
  color: string
  description?: string
}

export interface UpdateTagInput {
  name: string
  color: string
  description?: string
}

export interface ListAllTagsOptions {
  search?: string
}

export interface TagRepository {
  listAll(tenantContext: TenantContext, options?: ListAllTagsOptions): Promise<Tag[]>
  create(tenantContext: TenantContext, input: CreateTagInput): Promise<Tag>
  update(tenantContext: TenantContext, id: string, input: UpdateTagInput): Promise<Tag>
  delete(tenantContext: TenantContext, id: string): Promise<void>
}
