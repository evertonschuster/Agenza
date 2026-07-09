import type { Tag } from '../../../domain/entities/Tag'
import type { CreateTagInput, TagRepository } from '../../repositories/TagRepository'
import type { TenantContext } from '../../context/TenantContext'

export class CreateTag {
  private readonly tagRepository: TagRepository

  constructor(tagRepository: TagRepository) {
    this.tagRepository = tagRepository
  }

  execute(tenantContext: TenantContext, input: CreateTagInput): Promise<Tag> {
    return this.tagRepository.create(tenantContext, input)
  }
}
