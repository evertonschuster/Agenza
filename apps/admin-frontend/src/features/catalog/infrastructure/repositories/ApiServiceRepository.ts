import type { Service } from '@/features/catalog/domain/entities/Service'
import type {
  CreateServiceInput,
  ListAllServicesOptions,
  PagedServices,
  ServiceRepository,
  UpdateServiceInput,
} from '@/features/catalog/application/repositories/ServiceRepository'
import type { HttpClient } from '@/shared/application/HttpClient'
import type { TenantContext } from '@/features/auth'
import {
  mapServiceDtoToDomain,
  type PagedServiceDto,
  type ServiceDto,
} from '@/features/catalog/infrastructure/mappers/serviceMapper'
import type { components } from '@/features/catalog/infrastructure/generated/services-api'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 20

const SERVICES_URL = '/api/v1/services'

/**
 * The generated OpenAPI type marks `serviceId` as required in the PUT
 * body - the backend controller always overwrites it with the route id
 * before dispatching, so the value sent here is never actually read, but
 * building the wire body explicitly against this type - keyed on the
 * exact same `id` this method already routes to - makes route id and body
 * id structurally incapable of diverging (docs/adr/010).
 */
type UpdateServiceRequestBody = components['schemas']['UpdateServiceCommand']

/**
 * The /api/v1/services contract from docs/API.md. Tenant scope travels
 * in the X-Tenant-Id header the HttpClient attaches (verified server-side
 * against the JWT's tenant_id claim) - tenantContext is accepted here
 * only for structural enforcement (see admin-feature-vertical skill),
 * never read directly.
 */
export class ApiServiceRepository implements ServiceRepository {
  private readonly httpClient: HttpClient

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient
  }

  async listAll(
    _tenantContext: TenantContext,
    options: ListAllServicesOptions = {},
  ): Promise<PagedServices> {
    const { page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE, search, categoryId, tagId } = options
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (search !== undefined && search.trim() !== '') {
      query.set('search', search.trim())
    }
    if (categoryId !== undefined) {
      query.set('categoryId', categoryId)
    }
    if (tagId !== undefined) {
      query.set('tagId', tagId)
    }
    const envelope = await this.httpClient.get<PagedServiceDto>(
      `${SERVICES_URL}?${query.toString()}`,
    )
    return {
      services: envelope.items.map(mapServiceDtoToDomain),
      totalCount: envelope.totalCount,
      page: envelope.page,
      pageSize: envelope.pageSize,
    }
  }

  async create(_tenantContext: TenantContext, input: CreateServiceInput): Promise<Service> {
    const dto = await this.httpClient.post<ServiceDto>(SERVICES_URL, input)
    return mapServiceDtoToDomain(dto)
  }

  async update(
    _tenantContext: TenantContext,
    id: string,
    input: UpdateServiceInput,
  ): Promise<Service> {
    const body: UpdateServiceRequestBody = {
      serviceId: id,
      name: input.name,
      description: input.description ?? null,
      durationMinutes: input.durationMinutes,
      minDurationMinutes: input.minDurationMinutes,
      maxDurationMinutes: input.maxDurationMinutes,
      price: input.price,
      maxDiscountPercentage: input.maxDiscountPercentage,
      categoryId: input.categoryId ?? null,
      tagIds: input.tagIds ?? null,
    }
    const dto = await this.httpClient.put<ServiceDto>(`${SERVICES_URL}/${id}`, body)
    return mapServiceDtoToDomain(dto)
  }

  async delete(_tenantContext: TenantContext, id: string): Promise<void> {
    await this.httpClient.delete(`${SERVICES_URL}/${id}`)
  }
}
