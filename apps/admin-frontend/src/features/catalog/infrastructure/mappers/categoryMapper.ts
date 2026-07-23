import { Category } from '@/features/catalog/domain/entities/Category'
import type { components } from '@/features/catalog/infrastructure/generated/services-api'

/** The CategoryDto shape - generated from the live OpenAPI contract, not
 * hand-maintained (see src/infrastructure/generated/services-api.d.ts). */
export type CategoryDto = components['schemas']['CategoryResponse']

export function mapCategoryDtoToDomain(dto: CategoryDto): Category {
  return Category.create({ id: dto.id, name: dto.name })
}
