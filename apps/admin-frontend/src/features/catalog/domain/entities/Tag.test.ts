import { describe, it, expect } from 'vitest'
import { Tag, TAG_COLOR_PALETTE } from '@/features/catalog/domain/entities/Tag'
import { InvalidTagError } from '@/features/catalog/domain/errors/InvalidTagError'

describe('Tag', () => {
  it('creates a tag with valid values', () => {
    const result = Tag.create({
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

  it('creates a tag without a description', () => {
    const result = Tag.create({ id: 'tag-1', name: 'VIP', color: '#0d9488' })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.value.description).toBeUndefined()
  })

  it('fails when the id is empty', () => {
    const result = Tag.create({ id: '', name: 'VIP', color: '#0d9488' })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toBeInstanceOf(InvalidTagError)
  })

  it('fails when the name is empty', () => {
    const result = Tag.create({ id: 'tag-1', name: '  ', color: '#0d9488' })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toBeInstanceOf(InvalidTagError)
  })

  it('fails when the name is over 40 characters', () => {
    const name = 'x'.repeat(41)

    const result = Tag.create({ id: 'tag-1', name, color: '#0d9488' })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toBeInstanceOf(InvalidTagError)
  })

  it('fails when the color is not in the fixed palette', () => {
    const result = Tag.create({ id: 'tag-1', name: 'VIP', color: '#123456' })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toBeInstanceOf(InvalidTagError)
  })

  it('fails when the description is over 200 characters', () => {
    const description = 'x'.repeat(201)

    const result = Tag.create({ id: 'tag-1', name: 'VIP', color: '#0d9488', description })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toBeInstanceOf(InvalidTagError)
  })

  it('exposes the fixed color palette', () => {
    expect(TAG_COLOR_PALETTE).toHaveLength(8)
    expect(TAG_COLOR_PALETTE).toContain('#0d9488')
  })
})
