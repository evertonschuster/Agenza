import type { Category } from '@/features/catalog/domain/entities/Category'
import type {
  CategoryRepository,
  CreateCategoryInput,
  ListAllCategoriesOptions,
  UpdateCategoryInput,
} from '@/features/catalog/application/repositories/CategoryRepository'
import type { HttpClient } from '@/shared/application/HttpClient'
import type { TenantContext } from '@/features/auth'
import {
  mapCategoryDtoToDomain,
  type CategoryDto,
} from '@/features/catalog/infrastructure/mappers/categoryMapper'
import type { components } from '@/features/catalog/infrastructure/generated/services-api'

const CATEGORIES_URL = '/api/v1/categories'

/**
 * The generated OpenAPI type marks `categoryId` as required in the PUT
 * body - the backend controller always overwrites it with the route id
 * before dispatching, so the value sent here is never actually read, but
 * building the wire body explicitly against this type - keyed on the
 * exact same `id` this method already routes to - makes route id and body
 * id structurally incapable of diverging (docs/adr/010).
 */
type UpdateCategoryRequestBody = components['schemas']['UpdateCategoryCommand']

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

  async listAll(
    _tenantContext: TenantContext,
    options: ListAllCategoriesOptions = {},
  ): Promise<Category[]> {
    const query = new URLSearchParams()
    if (options.search !== undefined && options.search.trim() !== '') {
      query.set('search', options.search.trim())
    }
    const suffix = query.toString() === '' ? '' : `?${query.toString()}`
    const dtos = await this.httpClient.get<CategoryDto[]>(`${CATEGORIES_URL}${suffix}`)
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
    const body: UpdateCategoryRequestBody = { categoryId: id, name: input.name }
    const dto = await this.httpClient.put<CategoryDto>(`${CATEGORIES_URL}/${id}`, body)
    return mapCategoryDtoToDomain(dto)
  }

  async delete(_tenantContext: TenantContext, id: string): Promise<void> {
    await this.httpClient.delete(`${CATEGORIES_URL}/${id}`)
  }
}
