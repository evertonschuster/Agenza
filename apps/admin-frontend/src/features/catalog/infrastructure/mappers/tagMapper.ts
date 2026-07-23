import { Tag } from '@/features/catalog/domain/entities/Tag'
import type { components } from '@/features/catalog/infrastructure/generated/services-api'

/** The TagDto shape - generated from the live OpenAPI contract, not
 * hand-maintained (see src/features/catalog/infrastructure/generated/services-api.d.ts). */
export type TagDto = components['schemas']['TagResponse']

function isTagDto(value: unknown): value is TagDto {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const record = value as Record<string, unknown>
  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    typeof record.color === 'string' &&
    (record.description === null || typeof record.description === 'string')
  )
}

/** Validates an untrusted response body as a TagDto before any mapper trusts its shape (docs/adr/011). */
export function decodeTagDto(payload: unknown): TagDto {
  if (!isTagDto(payload)) {
    throw new Error('Malformed tag payload received from the API')
  }
  return payload
}

/** Same as decodeTagDto, for the GET /api/v1/tags list response. */
export function decodeTagDtoArray(payload: unknown): TagDto[] {
  if (!Array.isArray(payload) || !payload.every(isTagDto)) {
    throw new Error('Malformed tag list payload received from the API')
  }
  return payload
}

export function mapTagDtoToDomain(dto: TagDto): Tag {
  return Tag.create({
    id: dto.id,
    name: dto.name,
    color: dto.color,
    ...(dto.description !== null ? { description: dto.description } : {}),
  })
}
