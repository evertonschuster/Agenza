import type { Service } from '../../domain/entities/Service'
import type { TenantContext } from '../context/TenantContext'

export interface CreateServiceInput {
  name: string
  description?: string | null
  durationMinutes: number
  minDurationMinutes: number
  maxDurationMinutes: number
  price: number
  maxDiscountPercentage: number
  categoryId?: string | null
  tagIds?: string[]
}

export interface UpdateServiceInput {
  name: string
  description?: string | null
  durationMinutes: number
  minDurationMinutes: number
  maxDurationMinutes: number
  price: number
  maxDiscountPercentage: number
  categoryId?: string | null
  tagIds?: string[]
}

export interface ListAllServicesOptions {
  page?: number
  pageSize?: number
  search?: string
  categoryId?: string
  tagId?: string
}

/** The paginated shape `ServiceRepository.listAll` resolves to (docs/API.md `PagedResult<ServiceDto>`). */
export interface PagedServices {
  services: Service[]
  totalCount: number
  page: number
  pageSize: number
}

export interface ServiceRepository {
  listAll(tenantContext: TenantContext, options?: ListAllServicesOptions): Promise<PagedServices>
  create(tenantContext: TenantContext, input: CreateServiceInput): Promise<Service>
  update(tenantContext: TenantContext, id: string, input: UpdateServiceInput): Promise<Service>
  delete(tenantContext: TenantContext, id: string): Promise<void>
}
