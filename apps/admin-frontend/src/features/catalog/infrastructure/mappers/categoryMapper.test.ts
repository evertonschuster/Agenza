import { describe, it, expect } from 'vitest'
import {
  mapCategoryDtoToDomain,
  decodeCategoryDto,
  decodeCategoryDtoArray,
} from '@/features/catalog/infrastructure/mappers/categoryMapper'
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

describe('decodeCategoryDto', () => {
  it('accepts a well-formed payload', () => {
    const dto = { id: 'category-1', name: 'Massagens' }

    expect(decodeCategoryDto(dto)).toEqual(dto)
  })

  it('rejects a payload missing a required property', () => {
    expect(() => decodeCategoryDto({ id: 'category-1' })).toThrow()
  })

  it('rejects a payload with a wrong-typed property', () => {
    expect(() => decodeCategoryDto({ id: 'category-1', name: 42 })).toThrow()
  })

  it('rejects a non-object payload', () => {
    expect(() => decodeCategoryDto(null)).toThrow()
    expect(() => decodeCategoryDto(undefined)).toThrow()
  })
})

describe('decodeCategoryDtoArray', () => {
  it('rejects a non-array payload', () => {
    expect(() => decodeCategoryDtoArray({ id: 'category-1' })).toThrow()
  })

  it('rejects an array containing a malformed element', () => {
    expect(() => decodeCategoryDtoArray([{ id: 'category-1', name: 'Massagens' }, {}])).toThrow()
  })
})
