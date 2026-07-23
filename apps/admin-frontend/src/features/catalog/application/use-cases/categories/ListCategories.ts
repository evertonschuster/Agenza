import type { Category } from '@/features/catalog/domain/entities/Category'
import type {
  CategoryRepository,
  ListAllCategoriesOptions,
} from '@/features/catalog/application/repositories/CategoryRepository'
import type { TenantContext } from '@/features/auth'

export class ListCategories {
  private readonly categoryRepository: CategoryRepository

  constructor(categoryRepository: CategoryRepository) {
    this.categoryRepository = categoryRepository
  }

  execute(tenantContext: TenantContext, options?: ListAllCategoriesOptions): Promise<Category[]> {
    return this.categoryRepository.listAll(tenantContext, options)
  }
}
