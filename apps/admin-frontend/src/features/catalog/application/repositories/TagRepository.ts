import type { Tag } from '@/features/catalog/domain/entities/Tag'
import type { TenantContext } from '@/features/auth'
import type { AppError } from '@/shared/application/AppError'
import type { Result } from '@/shared/application/Result'

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
  listAll(
    tenantContext: TenantContext,
    options?: ListAllTagsOptions,
  ): Promise<Result<Tag[], AppError>>
  create(tenantContext: TenantContext, input: CreateTagInput): Promise<Result<Tag, AppError>>
  update(
    tenantContext: TenantContext,
    id: string,
    input: UpdateTagInput,
  ): Promise<Result<Tag, AppError>>
  delete(tenantContext: TenantContext, id: string): Promise<Result<void, AppError>>
}
