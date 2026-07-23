import { describe, it, expect } from 'vitest'
import {
  mapTagDtoToDomain,
  decodeTagDto,
  decodeTagDtoArray,
} from '@/features/catalog/infrastructure/mappers/tagMapper'
import { InvalidTagError } from '@/features/catalog/domain/errors/InvalidTagError'

describe('mapTagDtoToDomain', () => {
  it('maps every field from the DTO', () => {
    const tag = mapTagDtoToDomain({
      id: 'tag-1',
      name: 'VIP',
      color: '#0d9488',
      description: 'High-value client',
    })

    expect(tag.id).toBe('tag-1')
    expect(tag.name).toBe('VIP')
    expect(tag.color).toBe('#0d9488')
    expect(tag.description).toBe('High-value client')
  })

  it('maps a null description to undefined', () => {
    const tag = mapTagDtoToDomain({ id: 'tag-1', name: 'VIP', color: '#0d9488', description: null })

    expect(tag.description).toBeUndefined()
  })

  it('propagates the domain validation failure for an invalid color', () => {
    expect(() =>
      mapTagDtoToDomain({ id: 'tag-1', name: 'VIP', color: '#123456', description: null }),
    ).toThrow(InvalidTagError)
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
