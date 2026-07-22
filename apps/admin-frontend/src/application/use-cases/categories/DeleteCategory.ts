import type { CategoryRepository } from '../../repositories/CategoryRepository'
import type { TenantContext } from '../../context/TenantContext'

export class DeleteCategory {
  private readonly categoryRepository: CategoryRepository

  constructor(categoryRepository: CategoryRepository) {
    this.categoryRepository = categoryRepository
  }

  execute(tenantContext: TenantContext, id: string): Promise<void> {
    return this.categoryRepository.delete(tenantContext, id)
  }
}
