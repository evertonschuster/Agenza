import { describe, it, expect } from 'vitest'
import { Category } from '@/features/catalog/domain/entities/Category'
import { InvalidCategoryError } from '@/features/catalog/domain/errors/InvalidCategoryError'

describe('Category', () => {
  it('creates a category with valid values', () => {
    const result = Category.create({ id: 'category-1', name: 'Massagens' })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.value.id).toBe('category-1')
    expect(result.value.name).toBe('Massagens')
  })

  it('trims the name', () => {
    const result = Category.create({ id: 'category-1', name: '  Massagens  ' })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.value.name).toBe('Massagens')
  })

  it('fails when the id is empty', () => {
    const result = Category.create({ id: '', name: 'Massagens' })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toBeInstanceOf(InvalidCategoryError)
  })

  it('fails when the name is empty', () => {
    const result = Category.create({ id: 'category-1', name: '  ' })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toBeInstanceOf(InvalidCategoryError)
  })

  it('fails when the name is over 60 characters', () => {
    const name = 'x'.repeat(61)

    const result = Category.create({ id: 'category-1', name })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toBeInstanceOf(InvalidCategoryError)
  })
})
