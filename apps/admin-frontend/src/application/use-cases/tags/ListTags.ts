import type { Tag } from '../../../domain/entities/Tag'
import type { TagRepository } from '../../repositories/TagRepository'
import type { TenantContext } from '../../context/TenantContext'

export class ListTags {
  private readonly tagRepository: TagRepository

  constructor(tagRepository: TagRepository) {
    this.tagRepository = tagRepository
  }

  execute(tenantContext: TenantContext): Promise<Tag[]> {
    return this.tagRepository.listAll(tenantContext)
  }
}
