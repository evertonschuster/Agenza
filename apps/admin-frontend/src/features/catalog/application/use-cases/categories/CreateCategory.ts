import type { Category } from '@/features/catalog/domain/entities/Category'
import type {
  CategoryRepository,
  CreateCategoryInput,
} from '@/features/catalog/application/repositories/CategoryRepository'
import type { TenantContext } from '@/features/auth'

export class CreateCategory {
  private readonly categoryRepository: CategoryRepository

  constructor(categoryRepository: CategoryRepository) {
    this.categoryRepository = categoryRepository
  }

  execute(tenantContext: TenantContext, input: CreateCategoryInput): Promise<Category> {
    return this.categoryRepository.create(tenantContext, input)
  }
}
