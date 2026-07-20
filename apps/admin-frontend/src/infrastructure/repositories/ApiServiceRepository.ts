import type { Service } from '../../domain/entities/Service'
import type {
  CreateServiceInput,
  ListAllServicesOptions,
  PagedServices,
  ServiceRepository,
  UpdateServiceInput,
} from '../../application/repositories/ServiceRepository'
import type { HttpClient } from '../../application/ports/HttpClient'
import type { TenantContext } from '../../application/context/TenantContext'
import {
  mapServiceDtoToDomain,
  type PagedServiceDto,
  type ServiceDto,
} from '../mappers/serviceMapper'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 20

const SERVICES_URL = '/api/v1/services'

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
    const { page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE } = options
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
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
    const dto = await this.httpClient.put<ServiceDto>(`${SERVICES_URL}/${id}`, input)
    return mapServiceDtoToDomain(dto)
  }

  async delete(_tenantContext: TenantContext, id: string): Promise<void> {
    await this.httpClient.delete(`${SERVICES_URL}/${id}`)
  }
}
