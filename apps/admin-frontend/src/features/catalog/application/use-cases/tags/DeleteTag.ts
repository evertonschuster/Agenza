import type { TagRepository } from '@/features/catalog/application/repositories/TagRepository'
import type { TenantContext } from '@/features/auth'

export class DeleteTag {
  private readonly tagRepository: TagRepository

  constructor(tagRepository: TagRepository) {
    this.tagRepository = tagRepository
  }

  execute(tenantContext: TenantContext, id: string): Promise<void> {
    return this.tagRepository.delete(tenantContext, id)
  }
}
