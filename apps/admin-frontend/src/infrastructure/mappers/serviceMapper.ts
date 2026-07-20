import { Service, type TagSummary } from '../../domain/entities/Service'

/** The TagSummaryDto shape embedded on a ServiceDto (docs/API.md). */
export type TagSummaryDto = TagSummary

/** The ServiceDto shape confirmed in docs/API.md. */
export interface ServiceDto {
  id: string
  code: number
  name: string
  description: string | null
  durationMinutes: number
  minDurationMinutes: number
  maxDurationMinutes: number
  price: number
  maxDiscountPercentage: number
  categoryId: string | null
  categoryName: string | null
  tags: TagSummaryDto[]
}

/** The GET /api/v1/services envelope shape (docs/API.md `PagedResult<ServiceDto>`). */
export interface PagedServiceDto {
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
