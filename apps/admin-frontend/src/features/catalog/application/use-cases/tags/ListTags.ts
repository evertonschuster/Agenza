import type { Tag } from '@/features/catalog/domain/entities/Tag'
import type {
  TagRepository,
  ListAllTagsOptions,
} from '@/features/catalog/application/repositories/TagRepository'
import type { TenantContext } from '@/features/auth'

export class ListTags {
  private readonly tagRepository: TagRepository

  constructor(tagRepository: TagRepository) {
    this.tagRepository = tagRepository
  }

  execute(tenantContext: TenantContext, options?: ListAllTagsOptions): Promise<Tag[]> {
    return this.tagRepository.listAll(tenantContext, options)
  }
}
