import type { Tag } from '@/features/catalog/domain/entities/Tag'
import type {
  TagRepository,
  UpdateTagInput,
} from '@/features/catalog/application/repositories/TagRepository'
import type { TenantContext } from '@/features/auth'

export class UpdateTag {
  private readonly tagRepository: TagRepository

  constructor(tagRepository: TagRepository) {
    this.tagRepository = tagRepository
  }

  execute(tenantContext: TenantContext, id: string, input: UpdateTagInput): Promise<Tag> {
    return this.tagRepository.update(tenantContext, id, input)
  }
}
