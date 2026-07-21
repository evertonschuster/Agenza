import type { Category } from '../../domain/entities/Category'
import type { TenantContext } from '../context/TenantContext'

export interface CreateCategoryInput {
  name: string
}

export interface UpdateCategoryInput {
  name: string
}

export interface ListAllCategoriesOptions {
  search?: string
}

export interface CategoryRepository {
  listAll(tenantContext: TenantContext, options?: ListAllCategoriesOptions): Promise<Category[]>
  create(tenantContext: TenantContext, input: CreateCategoryInput): Promise<Category>
  update(tenantContext: TenantContext, id: string, input: UpdateCategoryInput): Promise<Category>
  delete(tenantContext: TenantContext, id: string): Promise<void>
}
