import type { Tag } from '../../../domain/entities/Tag'
import type { TagRepository, UpdateTagInput } from '../../repositories/TagRepository'
import type { TenantContext } from '../../context/TenantContext'

export class UpdateTag {
  private readonly tagRepository: TagRepository

  constructor(tagRepository: TagRepository) {
    this.tagRepository = tagRepository
  }

  execute(tenantContext: TenantContext, id: string, input: UpdateTagInput): Promise<Tag> {
    return this.tagRepository.update(tenantContext, id, input)
  }
}
