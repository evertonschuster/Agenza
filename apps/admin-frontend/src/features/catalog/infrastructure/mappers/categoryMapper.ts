import { Category } from '@/features/catalog/domain/entities/Category'
import type { components } from '@/features/catalog/infrastructure/generated/services-api'

/** The CategoryDto shape - generated from the live OpenAPI contract, not
 * hand-maintained (see src/features/catalog/infrastructure/generated/services-api.d.ts). */
export type CategoryDto = components['schemas']['CategoryResponse']

function isCategoryDto(value: unknown): value is CategoryDto {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const record = value as Record<string, unknown>
  return typeof record.id === 'string' && typeof record.name === 'string'
}

/** Validates an untrusted response body as a CategoryDto before any mapper trusts its shape (docs/adr/011). */
export function decodeCategoryDto(payload: unknown): CategoryDto {
  if (!isCategoryDto(payload)) {
    throw new Error('Malformed category payload received from the API')
  }
  return payload
}

/** Same as decodeCategoryDto, for the GET /api/v1/categories list response. */
export function decodeCategoryDtoArray(payload: unknown): CategoryDto[] {
  if (!Array.isArray(payload) || !payload.every(isCategoryDto)) {
    throw new Error('Malformed category list payload received from the API')
  }
  return payload
}

export function mapCategoryDtoToDomain(dto: CategoryDto): Category {
  return Category.create({ id: dto.id, name: dto.name })
}
