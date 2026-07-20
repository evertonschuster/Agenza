import type { Category } from '../../domain/entities/Category'
import type {
  CategoryRepository,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '../../application/repositories/CategoryRepository'
import type { HttpClient } from '../../application/ports/HttpClient'
import type { TenantContext } from '../../application/context/TenantContext'
import { mapCategoryDtoToDomain, type CategoryDto } from '../mappers/categoryMapper'

const CATEGORIES_URL = '/api/v1/categories'

/**
 * The /api/v1/categories contract from docs/API.md. Tenant scope travels
 * in the X-Tenant-Id header the HttpClient attaches (verified server-side
 * against the JWT's tenant_id claim) - tenantContext is accepted here
 * only for structural enforcement (see admin-feature-vertical skill),
 * never read directly.
 */
export class ApiCategoryRepository implements CategoryRepository {
  private readonly httpClient: HttpClient

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient
  }

  async listAll(_tenantContext: TenantContext): Promise<Category[]> {
    const dtos = await this.httpClient.get<CategoryDto[]>(CATEGORIES_URL)
    return dtos.map(mapCategoryDtoToDomain)
  }

  async create(_tenantContext: TenantContext, input: CreateCategoryInput): Promise<Category> {
    const dto = await this.httpClient.post<CategoryDto>(CATEGORIES_URL, input)
    return mapCategoryDtoToDomain(dto)
  }

  async update(
    _tenantContext: TenantContext,
    id: string,
    input: UpdateCategoryInput,
  ): Promise<Category> {
    const dto = await this.httpClient.put<CategoryDto>(`${CATEGORIES_URL}/${id}`, input)
    return mapCategoryDtoToDomain(dto)
  }

  async delete(_tenantContext: TenantContext, id: string): Promise<void> {
    await this.httpClient.delete(`${CATEGORIES_URL}/${id}`)
  }
}
