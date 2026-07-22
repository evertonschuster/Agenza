import type { Category } from '../../../domain/entities/Category'
import type { CategoryRepository, CreateCategoryInput } from '../../repositories/CategoryRepository'
import type { TenantContext } from '../../context/TenantContext'

export class CreateCategory {
  private readonly categoryRepository: CategoryRepository

  constructor(categoryRepository: CategoryRepository) {
    this.categoryRepository = categoryRepository
  }

  execute(tenantContext: TenantContext, input: CreateCategoryInput): Promise<Category> {
    return this.categoryRepository.create(tenantContext, input)
  }
}
