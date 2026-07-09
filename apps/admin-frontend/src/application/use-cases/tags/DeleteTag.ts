import type { TagRepository } from '../../repositories/TagRepository'
import type { TenantContext } from '../../context/TenantContext'

export class DeleteTag {
  private readonly tagRepository: TagRepository

  constructor(tagRepository: TagRepository) {
    this.tagRepository = tagRepository
  }

  execute(tenantContext: TenantContext, id: string): Promise<void> {
    return this.tagRepository.delete(tenantContext, id)
  }
}
