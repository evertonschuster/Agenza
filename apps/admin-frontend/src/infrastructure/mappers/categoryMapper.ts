import { Category } from '../../domain/entities/Category'

/** The CategoryDto shape confirmed in docs/API.md. */
export interface CategoryDto {
  id: string
  name: string
}

export function mapCategoryDtoToDomain(dto: CategoryDto): Category {
  return Category.create({ id: dto.id, name: dto.name })
}
