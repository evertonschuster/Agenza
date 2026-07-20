import type { Category } from '../../../domain/entities/Category'
import type { CategoryRepository } from '../../repositories/CategoryRepository'
import type { TenantContext } from '../../context/TenantContext'

export class ListCategories {
  private readonly categoryRepository: CategoryRepository

  constructor(categoryRepository: CategoryRepository) {
    this.categoryRepository = categoryRepository
  }

  execute(tenantContext: TenantContext): Promise<Category[]> {
    return this.categoryRepository.listAll(tenantContext)
  }
}
