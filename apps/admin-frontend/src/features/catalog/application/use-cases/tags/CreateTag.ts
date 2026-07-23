import type { Tag } from '@/features/catalog/domain/entities/Tag'
import type {
  CreateTagInput,
  TagRepository,
} from '@/features/catalog/application/repositories/TagRepository'
import type { TenantContext } from '@/features/auth'

export class CreateTag {
  private readonly tagRepository: TagRepository

  constructor(tagRepository: TagRepository) {
    this.tagRepository = tagRepository
  }

  execute(tenantContext: TenantContext, input: CreateTagInput): Promise<Tag> {
    return this.tagRepository.create(tenantContext, input)
  }
}
