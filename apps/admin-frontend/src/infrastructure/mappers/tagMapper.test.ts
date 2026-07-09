import { describe, it, expect } from 'vitest'
import { mapTagDtoToDomain } from './tagMapper'
import { InvalidTagError } from '../../domain/errors/InvalidTagError'

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
