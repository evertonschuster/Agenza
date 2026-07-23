import { Tag } from '@/features/catalog/domain/entities/Tag'
import type { components } from '@/features/catalog/infrastructure/generated/services-api'

/** The TagDto shape - generated from the live OpenAPI contract, not
 * hand-maintained (see src/infrastructure/generated/services-api.d.ts). */
export type TagDto = components['schemas']['TagResponse']

export function mapTagDtoToDomain(dto: TagDto): Tag {
  return Tag.create({
    id: dto.id,
    name: dto.name,
    color: dto.color,
    ...(dto.description !== null ? { description: dto.description } : {}),
  })
}
