import { describe, it, expect } from 'vitest'
import { Tag, TAG_COLOR_PALETTE } from '@/features/catalog/domain/entities/Tag'
import { InvalidTagError } from '@/features/catalog/domain/errors/InvalidTagError'

describe('Tag', () => {
  it('creates a tag with valid values', () => {
    const tag = Tag.create({
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

  it('creates a tag without a description', () => {
    const tag = Tag.create({ id: 'tag-1', name: 'VIP', color: '#0d9488' })

    expect(tag.description).toBeUndefined()
  })

  it('throws when the id is empty', () => {
    expect(() => Tag.create({ id: '', name: 'VIP', color: '#0d9488' })).toThrow(InvalidTagError)
  })

  it('throws when the name is empty', () => {
    expect(() => Tag.create({ id: 'tag-1', name: '  ', color: '#0d9488' })).toThrow(InvalidTagError)
  })

  it('throws when the name is over 40 characters', () => {
    const name = 'x'.repeat(41)

    expect(() => Tag.create({ id: 'tag-1', name, color: '#0d9488' })).toThrow(InvalidTagError)
  })

  it('throws when the color is not in the fixed palette', () => {
    expect(() => Tag.create({ id: 'tag-1', name: 'VIP', color: '#123456' })).toThrow(
      InvalidTagError,
    )
  })

  it('throws when the description is over 200 characters', () => {
    const description = 'x'.repeat(201)

    expect(() => Tag.create({ id: 'tag-1', name: 'VIP', color: '#0d9488', description })).toThrow(
      InvalidTagError,
    )
  })

  it('exposes the fixed color palette', () => {
    expect(TAG_COLOR_PALETTE).toHaveLength(8)
    expect(TAG_COLOR_PALETTE).toContain('#0d9488')
  })
})
