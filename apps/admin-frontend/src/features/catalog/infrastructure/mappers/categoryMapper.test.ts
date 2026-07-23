import { describe, it, expect } from 'vitest'
import { mapCategoryDtoToDomain } from '@/features/catalog/infrastructure/mappers/categoryMapper'
import { InvalidCategoryError } from '@/features/catalog/domain/errors/InvalidCategoryError'

describe('mapCategoryDtoToDomain', () => {
  it('maps every field from the DTO', () => {
    const category = mapCategoryDtoToDomain({ id: 'category-1', name: 'Massagens' })

    expect(category.id).toBe('category-1')
    expect(category.name).toBe('Massagens')
  })

  it('propagates the domain validation failure for an empty name', () => {
    expect(() => mapCategoryDtoToDomain({ id: 'category-1', name: '  ' })).toThrow(
      InvalidCategoryError,
    )
  })
})
