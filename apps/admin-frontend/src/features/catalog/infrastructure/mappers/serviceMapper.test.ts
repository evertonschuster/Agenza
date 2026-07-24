import { describe, it, expect } from 'vitest'
import {
  mapServiceDtoToDomain,
  decodeServiceDto,
  decodePagedServiceDto,
  type ServiceDto,
} from '@/features/catalog/infrastructure/mappers/serviceMapper'
import { InvalidServiceError } from '@/features/catalog/domain/errors/InvalidServiceError'

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

describe('decodeServiceDto', () => {
  it('accepts a well-formed payload', () => {
    const dto = buildDto()

    expect(decodeServiceDto(dto)).toEqual(dto)
  })

  it('accepts a numeric field arriving as a string, deferring the real check to Service.create', () => {
    const dto = { ...buildDto(), durationMinutes: '60' as unknown as number }

    expect(decodeServiceDto(dto)).toEqual(dto)
  })

  it('rejects a payload missing a required property', () => {
    const withoutName: Record<string, unknown> = { ...buildDto() }
    delete withoutName.name

    expect(() => decodeServiceDto(withoutName)).toThrow()
  })

  it('rejects a payload with a wrong-typed property', () => {
    expect(() => decodeServiceDto({ ...buildDto(), id: 42 })).toThrow()
  })

  it('rejects a payload whose tags are not an array of TagSummary', () => {
    expect(() => decodeServiceDto({ ...buildDto(), tags: [{ id: 'tag-1' }] })).toThrow()
  })

  it('rejects a non-object payload', () => {
    expect(() => decodeServiceDto(null)).toThrow()
    expect(() => decodeServiceDto('not an object')).toThrow()
  })
})

describe('decodePagedServiceDto', () => {
  function buildEnvelope(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      items: [buildDto()],
      totalCount: 1,
      page: 1,
      pageSize: 20,
      ...overrides,
    }
  }

  it('accepts a well-formed envelope', () => {
    const envelope = decodePagedServiceDto(buildEnvelope())

    expect(envelope.items).toEqual([buildDto()])
    expect(envelope.totalCount).toBe(1)
    expect(envelope.page).toBe(1)
    expect(envelope.pageSize).toBe(20)
  })

  it('coerces numeric-string pagination metadata into real numbers', () => {
    const envelope = decodePagedServiceDto(buildEnvelope({ totalCount: '45', page: '2' }))

    expect(envelope.totalCount).toBe(45)
    expect(envelope.page).toBe(2)
  })

  it('rejects an envelope whose items are not an array', () => {
    expect(() => decodePagedServiceDto(buildEnvelope({ items: buildDto() }))).toThrow()
  })

  it('rejects an envelope containing a malformed item', () => {
    expect(() => decodePagedServiceDto(buildEnvelope({ items: [{}] }))).toThrow()
  })

  it('rejects an envelope with a non-numeric totalCount', () => {
    expect(() => decodePagedServiceDto(buildEnvelope({ totalCount: 'not a number' }))).toThrow()
  })

  it('rejects an envelope missing pagination metadata entirely', () => {
    expect(() => decodePagedServiceDto({ items: [buildDto()] })).toThrow()
  })

  it('rejects a non-object envelope', () => {
    expect(() => decodePagedServiceDto(null)).toThrow()
    expect(() => decodePagedServiceDto([buildDto()])).toThrow()
  })
})
