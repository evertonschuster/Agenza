import { Service } from '@/features/catalog/domain/entities/Service'
import type { components } from '@/features/catalog/infrastructure/generated/services-api'

/** The TagSummaryDto shape embedded on a ServiceDto - generated from the
 * live OpenAPI contract (see src/infrastructure/generated/services-api.d.ts). */
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
