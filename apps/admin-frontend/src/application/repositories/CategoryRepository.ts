import type { Category } from '../../domain/entities/Category'
import type { TenantContext } from '../context/TenantContext'

export interface CreateCategoryInput {
  name: string
}

export interface UpdateCategoryInput {
  name: string
}

export interface CategoryRepository {
  listAll(tenantContext: TenantContext): Promise<Category[]>
  create(tenantContext: TenantContext, input: CreateCategoryInput): Promise<Category>
  update(tenantContext: TenantContext, id: string, input: UpdateCategoryInput): Promise<Category>
  delete(tenantContext: TenantContext, id: string): Promise<void>
}
