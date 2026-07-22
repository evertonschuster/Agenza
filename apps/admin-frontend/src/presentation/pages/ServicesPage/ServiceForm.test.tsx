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

function withDuration(durationMinutes: string): ServiceFormInput {
  return {
    ...validInput([]),
    durationMinutes,
    minDurationMinutes: durationMinutes,
    maxDurationMinutes: durationMinutes,
  }
}

function withPrice(price: string): ServiceFormInput {
  return { ...validInput([]), price }
}

function withDiscount(maxDiscountPercentage: string): ServiceFormInput {
  return { ...validInput([]), maxDiscountPercentage }
}

describe('serviceFormSchema numeric precision', () => {
  describe('durations', () => {
    it.each(['30', '1', '1440'])('accepts the whole-minute duration "%s"', duration => {
      expect(serviceFormSchema.safeParse(withDuration(duration)).success).toBe(true)
    })

    it.each(['30.5', '30.0', 'NaN', 'Infinity', '1e309', '', '   '])(
      'rejects the fractional/malformed duration "%s"',
      duration => {
        const result = serviceFormSchema.safeParse(withDuration(duration))
        expect(result.success).toBe(false)
      },
    )
  })

  describe('price', () => {
    it.each(['10', '10.0', '10.00', '0'])('accepts the price "%s"', price => {
      expect(serviceFormSchema.safeParse(withPrice(price)).success).toBe(true)
    })

    it.each(['10.123', 'NaN', 'Infinity', '1e309', '', '   '])(
      'rejects the malformed price "%s"',
      price => {
        expect(serviceFormSchema.safeParse(withPrice(price)).success).toBe(false)
      },
    )

    it('rejects a negative price with the domain-specific message', () => {
      const result = serviceFormSchema.safeParse(withPrice('-5'))

      expect(result.success).toBe(false)
      if (!result.success) {
        const priceIssue = result.error.issues.find(issue => issue.path.join('.') === 'price')
        expect(priceIssue?.message).toMatch(/não pode ser negativo/)
      }
    })
  })

  describe('discount', () => {
    it.each(['0', '10.5', '100', '99.99'])('accepts the discount "%s"', discount => {
      expect(serviceFormSchema.safeParse(withDiscount(discount)).success).toBe(true)
    })

    it.each(['10.123', 'NaN', 'Infinity', '1e309', '', '   '])(
      'rejects the malformed discount "%s"',
      discount => {
        expect(serviceFormSchema.safeParse(withDiscount(discount)).success).toBe(false)
      },
    )

    it('rejects an out-of-range discount with the domain-specific message', () => {
      const result = serviceFormSchema.safeParse(withDiscount('150'))

      expect(result.success).toBe(false)
      if (!result.success) {
        const discountIssue = result.error.issues.find(
          issue => issue.path.join('.') === 'maxDiscountPercentage',
        )
        expect(discountIssue?.message).toMatch(/entre 0 e 100/)
      }
    })
  })
})
