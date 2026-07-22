import { describe, it, expect } from 'vitest'
import { Category } from './Category'
import { InvalidCategoryError } from '../errors/InvalidCategoryError'

describe('Category', () => {
  it('creates a category with valid values', () => {
    const category = Category.create({ id: 'category-1', name: 'Massagens' })

    expect(category.id).toBe('category-1')
    expect(category.name).toBe('Massagens')
  })

  it('trims the name', () => {
    const category = Category.create({ id: 'category-1', name: '  Massagens  ' })

    expect(category.name).toBe('Massagens')
  })

  it('throws when the id is empty', () => {
    expect(() => Category.create({ id: '', name: 'Massagens' })).toThrow(InvalidCategoryError)
  })

  it('throws when the name is empty', () => {
    expect(() => Category.create({ id: 'category-1', name: '  ' })).toThrow(InvalidCategoryError)
  })

  it('throws when the name is over 60 characters', () => {
    const name = 'x'.repeat(61)

    expect(() => Category.create({ id: 'category-1', name })).toThrow(InvalidCategoryError)
  })
})
