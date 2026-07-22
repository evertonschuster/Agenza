import { describe, it, expect } from 'vitest'
import { mapServiceDtoToDomain, type ServiceDto } from './serviceMapper'
import { InvalidServiceError } from '../../domain/errors/InvalidServiceError'

function buildDto(overrides: Partial<ServiceDto> = {}): ServiceDto {
  return {
    id: 'service-1',
    code: 1001,
    name: 'Massagem relaxante',
    description: null,
    durationMinutes: 60,
    minDurationMinutes: 30,
    maxDurationMinutes: 90,
    price: 150,
    maxDiscountPercentage: 10,
    categoryId: null,
    categoryName: null,
    tags: [],
    ...overrides,
  }
}

describe('mapServiceDtoToDomain', () => {
  it('maps every field from the DTO', () => {
    const service = mapServiceDtoToDomain(
      buildDto({
        description: 'Uma massagem relaxante',
        categoryId: 'category-1',
        categoryName: 'Massagens',
        tags: [{ id: 'tag-1', name: 'VIP', color: '#0d9488' }],
      }),
    )

    expect(service.id).toBe('service-1')
    expect(service.code).toBe(1001)
    expect(service.name).toBe('Massagem relaxante')
    expect(service.description).toBe('Uma massagem relaxante')
    expect(service.durationMinutes).toBe(60)
    expect(service.minDurationMinutes).toBe(30)
    expect(service.maxDurationMinutes).toBe(90)
    expect(service.price).toBe(150)
    expect(service.maxDiscountPercentage).toBe(10)
    expect(service.categoryId).toBe('category-1')
    expect(service.categoryName).toBe('Massagens')
    expect(service.tags).toEqual([{ id: 'tag-1', name: 'VIP', color: '#0d9488' }])
  })

  it('maps null description, categoryId, and categoryName to undefined', () => {
    const service = mapServiceDtoToDomain(buildDto())

    expect(service.description).toBeUndefined()
    expect(service.categoryId).toBeUndefined()
    expect(service.categoryName).toBeUndefined()
  })

  it('propagates the domain validation failure for an invalid duration range', () => {
    expect(() =>
      mapServiceDtoToDomain(buildDto({ minDurationMinutes: 100, durationMinutes: 60 })),
    ).toThrow(InvalidServiceError)
  })
})
