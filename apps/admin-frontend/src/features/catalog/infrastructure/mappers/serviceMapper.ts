import { Service } from '@/features/catalog/domain/entities/Service'
import type { components } from '@/features/catalog/infrastructure/generated/services-api'

/** The TagSummaryDto shape embedded on a ServiceDto - generated from the
 * live OpenAPI contract (see src/features/catalog/infrastructure/generated/services-api.d.ts). */
export type TagSummaryDto = components['schemas']['TagSummary']

type NumericServiceFields =
  | 'code'
  | 'durationMinutes'
  | 'minDurationMinutes'
  | 'maxDurationMinutes'
  | 'price'
  | 'maxDiscountPercentage'

/**
 * The generated ServiceResponse types every numeric field as `number | string`
 * - a known quirk of the built-in ASP.NET Core OpenAPI generator's schema
 * for value types, not an actual API behavior difference (the API only ever
 * sends real JSON numbers). Narrowed back to `number` here so callers don't
 * have to guard against a union that never occurs in practice.
 */
export type ServiceDto = Omit<components['schemas']['ServiceResponse'], NumericServiceFields> &
  Record<NumericServiceFields, number>

/** The GET /api/v1/services envelope shape - generated from the live
 * OpenAPI contract, with the same numeric narrowing as ServiceDto. */
export type PagedServiceDto = Omit<
  components['schemas']['PagedResultOfServiceResponse'],
  'items' | 'totalCount' | 'page' | 'pageSize'
> & {
  items: ServiceDto[]
  totalCount: number
  page: number
  pageSize: number
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

// The generated ServiceResponse widens every numeric field to number|string
// (see the ServiceDto comment above) - Service.create() performs the real
// finite/integer narrowing with its own curated per-field messages
// (docs/adr/010), so this boundary check only rules out a value that isn't
// plausibly numeric at all (e.g. a boolean or nested object), rather than
// duplicating that finite-number validation here.
function isPlausibleNumeric(value: unknown): value is number | string {
  return typeof value === 'number' || typeof value === 'string'
}

function isTagSummaryDto(value: unknown): value is TagSummaryDto {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const record = value as Record<string, unknown>
  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    typeof record.color === 'string'
  )
}

function isServiceDto(value: unknown): value is ServiceDto {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const record = value as Record<string, unknown>
  return (
    typeof record.id === 'string' &&
    isPlausibleNumeric(record.code) &&
    typeof record.name === 'string' &&
    isNullableString(record.description) &&
    isPlausibleNumeric(record.durationMinutes) &&
    isPlausibleNumeric(record.minDurationMinutes) &&
    isPlausibleNumeric(record.maxDurationMinutes) &&
    isPlausibleNumeric(record.price) &&
    isPlausibleNumeric(record.maxDiscountPercentage) &&
    isNullableString(record.categoryId) &&
    isNullableString(record.categoryName) &&
    Array.isArray(record.tags) &&
    record.tags.every(isTagSummaryDto)
  )
}

/**
 * Envelope pagination metadata has no domain entity of its own to validate
 * it (unlike Service's own fields, guarded by Service.create) - coerced and
 * checked for real finiteness right here instead.
 */
function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return null
}

/** Validates an untrusted response body as a ServiceDto before any mapper trusts its shape (docs/adr/011). */
export function decodeServiceDto(payload: unknown): ServiceDto {
  if (!isServiceDto(payload)) {
    throw new Error('Malformed service payload received from the API')
  }
  return payload
}

/** Validates the GET /api/v1/services paged envelope, including its pagination metadata (docs/adr/011). */
export function decodePagedServiceDto(payload: unknown): PagedServiceDto {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Malformed paged service list payload received from the API')
  }
  const record = payload as Record<string, unknown>
  const totalCount = toFiniteNumber(record.totalCount)
  const page = toFiniteNumber(record.page)
  const pageSize = toFiniteNumber(record.pageSize)

  if (
    !Array.isArray(record.items) ||
    !record.items.every(isServiceDto) ||
    totalCount === null ||
    page === null ||
    pageSize === null
  ) {
    throw new Error('Malformed paged service list payload received from the API')
  }

  return { items: record.items, totalCount, page, pageSize }
}

export function mapServiceDtoToDomain(dto: ServiceDto): Service {
  return Service.create({
    id: dto.id,
    code: dto.code,
    name: dto.name,
    durationMinutes: dto.durationMinutes,
    minDurationMinutes: dto.minDurationMinutes,
    maxDurationMinutes: dto.maxDurationMinutes,
    price: dto.price,
    maxDiscountPercentage: dto.maxDiscountPercentage,
    tags: dto.tags,
    ...(dto.description !== null ? { description: dto.description } : {}),
    ...(dto.categoryId !== null ? { categoryId: dto.categoryId } : {}),
    ...(dto.categoryName !== null ? { categoryName: dto.categoryName } : {}),
  })
}
