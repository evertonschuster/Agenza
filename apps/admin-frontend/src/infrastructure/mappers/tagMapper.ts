import { Tag } from '../../domain/entities/Tag'

/** The TagDto shape confirmed in docs/API.md. */
export interface TagDto {
  id: string
  name: string
  color: string
  description: string | null
}

export function mapTagDtoToDomain(dto: TagDto): Tag {
  return Tag.create({
    id: dto.id,
    name: dto.name,
    color: dto.color,
    ...(dto.description !== null ? { description: dto.description } : {}),
  })
}
