import type { Category } from '@/features/catalog/domain/entities/Category'
import type {
  CategoryRepository,
  UpdateCategoryInput,
} from '@/features/catalog/application/repositories/CategoryRepository'
import type { TenantContext } from '@/features/auth'

export class UpdateCategory {
  private readonly categoryRepository: CategoryRepository

  constructor(categoryRepository: CategoryRepository) {
    this.categoryRepository = categoryRepository
  }

  execute(tenantContext: TenantContext, id: string, input: UpdateCategoryInput): Promise<Category> {
    return this.categoryRepository.update(tenantContext, id, input)
  }
}
