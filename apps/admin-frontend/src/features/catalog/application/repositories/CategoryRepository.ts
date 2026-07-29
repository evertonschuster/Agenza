import type { Category } from '@/features/catalog/domain/entities/Category'
import type { AppError } from '@/shared/application/AppError'
import type { Result } from '@/shared/application/Result'

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
  listAll(options?: ListAllCategoriesOptions): Promise<Result<Category[], AppError>>
  create(input: CreateCategoryInput): Promise<Result<Category, AppError>>
  update(id: string, input: UpdateCategoryInput): Promise<Result<Category, AppError>>
  delete(id: string): Promise<Result<void, AppError>>
}
