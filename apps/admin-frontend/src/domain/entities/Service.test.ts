import { describe, it, expect } from 'vitest'
import { Service } from './Service'
import { InvalidServiceError } from '../errors/InvalidServiceError'

function validInput(
  overrides: Partial<Parameters<typeof Service.create>[0]> = {},
): Parameters<typeof Service.create>[0] {
  return {
    id: 'service-1',
    code: 1001,
    name: 'Massagem relaxante',
    durationMinutes: 60,
    minDurationMinutes: 30,
    maxDurationMinutes: 90,
    price: 150,
    maxDiscountPercentage: 10,
    tags: [],
    ...overrides,
  }
}

describe('Service', () => {
  it('creates a service with valid values', () => {
    const service = Service.create(
      validInput({
        description: 'Uma massagem relaxante de corpo inteiro',
        categoryId: 'category-1',
        categoryName: 'Massagens',
        tags: [{ id: 'tag-1', name: 'VIP', color: '#0d9488' }],
      }),
    )

    expect(service.id).toBe('service-1')
    expect(service.code).toBe(1001)
    expect(service.name).toBe('Massagem relaxante')
    expect(service.description).toBe('Uma massagem relaxante de corpo inteiro')
    expect(service.durationMinutes).toBe(60)
    expect(service.minDurationMinutes).toBe(30)
    expect(service.maxDurationMinutes).toBe(90)
    expect(service.price).toBe(150)
    expect(service.maxDiscountPercentage).toBe(10)
    expect(service.categoryId).toBe('category-1')
    expect(service.categoryName).toBe('Massagens')
    expect(service.tags).toEqual([{ id: 'tag-1', name: 'VIP', color: '#0d9488' }])
  })

  it('creates a service without a description, category, or tags', () => {
    const service = Service.create(validInput())

    expect(service.description).toBeUndefined()
    expect(service.categoryId).toBeUndefined()
    expect(service.categoryName).toBeUndefined()
    expect(service.tags).toEqual([])
  })

  it('throws when the id is empty', () => {
    expect(() => Service.create(validInput({ id: '' }))).toThrow(InvalidServiceError)
  })

  it('throws when the name is empty', () => {
    expect(() => Service.create(validInput({ name: '  ' }))).toThrow(InvalidServiceError)
  })

  it('throws when the name is over 80 characters', () => {
    expect(() => Service.create(validInput({ name: 'x'.repeat(81) }))).toThrow(InvalidServiceError)
  })

  it('throws when the description is over 500 characters', () => {
    expect(() => Service.create(validInput({ description: 'x'.repeat(501) }))).toThrow(
      InvalidServiceError,
    )
  })

  it('allows a description of exactly 500 characters', () => {
    const service = Service.create(validInput({ description: 'x'.repeat(500) }))

    expect(service.description).toHaveLength(500)
  })

  it('throws when minDurationMinutes is less than 1', () => {
    expect(() =>
      Service.create(validInput({ minDurationMinutes: 0, durationMinutes: 30 })),
    ).toThrow(InvalidServiceError)
  })

  it('throws when minDurationMinutes is greater than durationMinutes', () => {
    expect(() =>
      Service.create(validInput({ minDurationMinutes: 61, durationMinutes: 60 })),
    ).toThrow(InvalidServiceError)
  })

  it('throws when durationMinutes is greater than maxDurationMinutes', () => {
    expect(() =>
      Service.create(validInput({ durationMinutes: 91, maxDurationMinutes: 90 })),
    ).toThrow(InvalidServiceError)
  })

  it('throws when maxDurationMinutes exceeds 1440', () => {
    expect(() =>
      Service.create(
        validInput({ minDurationMinutes: 30, durationMinutes: 1441, maxDurationMinutes: 1441 }),
      ),
    ).toThrow(InvalidServiceError)
  })

  it('throws when price is negative', () => {
    expect(() => Service.create(validInput({ price: -1 }))).toThrow(InvalidServiceError)
  })

  it('throws when maxDiscountPercentage is negative', () => {
    expect(() => Service.create(validInput({ maxDiscountPercentage: -1 }))).toThrow(
      InvalidServiceError,
    )
  })

  it('throws when maxDiscountPercentage is over 100', () => {
    expect(() => Service.create(validInput({ maxDiscountPercentage: 101 }))).toThrow(
      InvalidServiceError,
    )
  })

  describe('external numeric data validation (the API widens every numeric field to number | string)', () => {
    it.each(['code', 'durationMinutes', 'minDurationMinutes', 'maxDurationMinutes'] as const)(
      'rejects %s as a fractional value even though the range checks would otherwise pass',
      field => {
        expect(() => Service.create(validInput({ [field]: 60.5 }))).toThrow(InvalidServiceError)
      },
    )

    it.each([
      'code',
      'durationMinutes',
      'minDurationMinutes',
      'maxDurationMinutes',
      'price',
      'maxDiscountPercentage',
    ] as const)('rejects %s as NaN', field => {
      expect(() => Service.create(validInput({ [field]: Number.NaN }))).toThrow(InvalidServiceError)
    })

    it.each([
      'code',
      'durationMinutes',
      'minDurationMinutes',
      'maxDurationMinutes',
      'price',
      'maxDiscountPercentage',
    ] as const)('rejects %s as Infinity', field => {
      expect(() => Service.create(validInput({ [field]: Number.POSITIVE_INFINITY }))).toThrow(
        InvalidServiceError,
      )
    })

    it.each([
      'code',
      'durationMinutes',
      'minDurationMinutes',
      'maxDurationMinutes',
      'price',
      'maxDiscountPercentage',
    ] as const)(
      'rejects %s arriving as a string, as the generated ServiceResponse type allows',
      field => {
        // Simulates the real unsoundness: serviceMapper's ServiceDto cast
        // claims `number`, but a genuinely untrusted response could still
        // send a string for one of these fields.
        const input = validInput({ [field]: '60' as unknown as number })
        expect(() => Service.create(input)).toThrow(InvalidServiceError)
      },
    )

    it('allows a fractional price and maxDiscountPercentage (decimal, not integer, fields)', () => {
      const service = Service.create(validInput({ price: 149.99, maxDiscountPercentage: 12.5 }))

      expect(service.price).toBe(149.99)
      expect(service.maxDiscountPercentage).toBe(12.5)
    })
  })

  it('stores tags as a defensive copy, not a reference to the caller-supplied array', () => {
    const tags = [{ id: 'tag-1', name: 'VIP', color: '#0d9488' }]
    const service = Service.create(validInput({ tags }))

    tags.push({ id: 'tag-2', name: 'Novo', color: '#ef4444' })

    expect(service.tags).toHaveLength(1)
  })
})
