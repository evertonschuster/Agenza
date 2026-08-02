import { describe, it, expect } from 'vitest'
import {
  mapTagDtoToDomain,
  decodeTagDto,
  decodeTagDtoArray,
} from '@/features/catalog/infrastructure/mappers/tagMapper'

describe('mapTagDtoToDomain', () => {
  it('maps every field from the DTO', () => {
    const result = mapTagDtoToDomain({
      id: 'tag-1',
      name: 'VIP',
      color: '#0d9488',
      description: 'High-value client',
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.value.id).toBe('tag-1')
    expect(result.value.name).toBe('VIP')
    expect(result.value.color).toBe('#0d9488')
    expect(result.value.description).toBe('High-value client')
  })

  it('maps a null description to undefined', () => {
    const result = mapTagDtoToDomain({
      id: 'tag-1',
      name: 'VIP',
      color: '#0d9488',
      description: null,
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.value.description).toBeUndefined()
  })

  it('maps the domain validation failure for an invalid color to a curated AppError', () => {
    const result = mapTagDtoToDomain({
      id: 'tag-1',
      name: 'VIP',
      color: '#123456',
      description: null,
    })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.code).toBe('unexpected')
  })
})

describe('decodeTagDto', () => {
  it('accepts a well-formed payload', () => {
    const dto = { id: 'tag-1', name: 'VIP', color: '#0d9488', description: null }

    expect(decodeTagDto(dto)).toEqual(dto)
  })

  it('rejects a payload missing a required property', () => {
    expect(() => decodeTagDto({ id: 'tag-1', color: '#0d9488', description: null })).toThrow()
  })

  it('rejects a payload with a wrong-typed property', () => {
    expect(() =>
      decodeTagDto({ id: 'tag-1', name: 42, color: '#0d9488', description: null }),
    ).toThrow()
  })

  it('rejects a non-object payload', () => {
    expect(() => decodeTagDto('not an object')).toThrow()
    expect(() => decodeTagDto(null)).toThrow()
    expect(() => decodeTagDto(undefined)).toThrow()
  })
})

describe('decodeTagDtoArray', () => {
  it('accepts a well-formed array', () => {
    const dtos = [{ id: 'tag-1', name: 'VIP', color: '#0d9488', description: null }]

    expect(decodeTagDtoArray(dtos)).toEqual(dtos)
  })

  it('rejects a non-array payload', () => {
    expect(() => decodeTagDtoArray({ id: 'tag-1' })).toThrow()
  })

  it('rejects an array containing a malformed element', () => {
    expect(() =>
      decodeTagDtoArray([{ id: 'tag-1', name: 'VIP', color: '#0d9488', description: null }, {}]),
    ).toThrow()
  })
})
