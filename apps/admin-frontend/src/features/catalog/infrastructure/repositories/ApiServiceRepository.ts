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
  decodeServiceDto,
  decodePagedServiceDto,
} from '@/features/catalog/infrastructure/mappers/serviceMapper'
import type { components } from '@/features/catalog/infrastructure/generated/services-api'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 20

const SERVICES_URL = '/api/v1/services'

// The route id is always keyed into the PUT body too (docs/adr/010) so the
// two are structurally incapable of diverging, even though the backend
// controller only ever trusts the route id.
type CreateServiceRequestBody = components['schemas']['CreateServiceCommand']
type UpdateServiceRequestBody = components['schemas']['UpdateServiceCommand']

// tenantContext is accepted for structural enforcement only - tenant scope
// travels in the X-Tenant-Id header the HttpClient attaches.
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
    const envelope = await this.httpClient.get(
      `${SERVICES_URL}?${query.toString()}`,
      decodePagedServiceDto,
    )
    return {
      services: envelope.items.map(mapServiceDtoToDomain),
      totalCount: envelope.totalCount,
      page: envelope.page,
      pageSize: envelope.pageSize,
    }
  }

  async create(_tenantContext: TenantContext, input: CreateServiceInput): Promise<Service> {
    const body = {
      name: input.name,
      description: input.description ?? null,
      durationMinutes: input.durationMinutes,
      minDurationMinutes: input.minDurationMinutes,
      maxDurationMinutes: input.maxDurationMinutes,
      price: input.price,
      maxDiscountPercentage: input.maxDiscountPercentage,
      categoryId: input.categoryId ?? null,
      tagIds: input.tagIds !== undefined ? [...input.tagIds] : null,
    } satisfies CreateServiceRequestBody
    const dto = await this.httpClient.post(SERVICES_URL, body, decodeServiceDto)
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
      tagIds: input.tagIds !== undefined ? [...input.tagIds] : null,
    }
    const dto = await this.httpClient.put(`${SERVICES_URL}/${id}`, body, decodeServiceDto)
    return mapServiceDtoToDomain(dto)
  }

  async delete(_tenantContext: TenantContext, id: string): Promise<void> {
    await this.httpClient.delete(`${SERVICES_URL}/${id}`)
  }
}
