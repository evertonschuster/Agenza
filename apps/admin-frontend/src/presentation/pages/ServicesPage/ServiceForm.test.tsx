import { describe, it, expect } from 'vitest'
import { serviceFormSchema, type ServiceFormInput } from './ServiceForm.schema'

function validInput(tagIds: string[]): ServiceFormInput {
  return {
    name: 'Corte de cabelo',
    description: '',
    durationMinutes: '30',
    minDurationMinutes: '15',
    maxDurationMinutes: '60',
    price: '50',
    maxDiscountPercentage: '10',
    categoryId: null,
    tagIds,
  }
}

describe('serviceFormSchema tagIds validation', () => {
  it('accepts an empty tagIds list', () => {
    expect(serviceFormSchema.safeParse(validInput([])).success).toBe(true)
  })

  it('accepts a single tag id', () => {
    expect(serviceFormSchema.safeParse(validInput(['tag-1'])).success).toBe(true)
  })

  it('accepts multiple distinct tag ids', () => {
    expect(serviceFormSchema.safeParse(validInput(['tag-1', 'tag-2', 'tag-3'])).success).toBe(true)
  })

  it('rejects a duplicated tag id', () => {
    const result = serviceFormSchema.safeParse(validInput(['tag-1', 'tag-1']))

    expect(result.success).toBe(false)
    if (!result.success) {
      const tagIdsIssue = result.error.issues.find(issue => issue.path.join('.') === 'tagIds')
      expect(tagIdsIssue?.message).toMatch(/duplicad/)
    }
  })

  it('rejects when only some tag ids are duplicated among otherwise-distinct ids', () => {
    const result = serviceFormSchema.safeParse(validInput(['tag-1', 'tag-2', 'tag-1']))

    expect(result.success).toBe(false)
    if (!result.success) {
      const tagIdsIssue = result.error.issues.find(issue => issue.path.join('.') === 'tagIds')
      expect(tagIdsIssue).toBeDefined()
    }
  })
})
