import type { Category } from '../../../domain/entities/Category'
import type { CategoryRepository, UpdateCategoryInput } from '../../repositories/CategoryRepository'
import type { TenantContext } from '../../context/TenantContext'

export class UpdateCategory {
  private readonly categoryRepository: CategoryRepository

  constructor(categoryRepository: CategoryRepository) {
    this.categoryRepository = categoryRepository
  }

  execute(tenantContext: TenantContext, id: string, input: UpdateCategoryInput): Promise<Category> {
    return this.categoryRepository.update(tenantContext, id, input)
  }
}
