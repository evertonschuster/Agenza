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
  decodeCategoryDto,
  decodeCategoryDtoArray,
} from '@/features/catalog/infrastructure/mappers/categoryMapper'
import type { components } from '@/features/catalog/infrastructure/generated/services-api'

const CATEGORIES_URL = '/api/v1/categories'

// The route id is always keyed into the PUT body too (docs/adr/010) so the
// two are structurally incapable of diverging, even though the backend
// controller only ever trusts the route id.
type CreateCategoryRequestBody = components['schemas']['CreateCategoryCommand']
type UpdateCategoryRequestBody = components['schemas']['UpdateCategoryCommand']

// tenantContext is accepted for structural enforcement only - tenant scope
// travels in the X-Tenant-Id header the HttpClient attaches.
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
    const dtos = await this.httpClient.get(`${CATEGORIES_URL}${suffix}`, decodeCategoryDtoArray)
    return dtos.map(mapCategoryDtoToDomain)
  }

  async create(_tenantContext: TenantContext, input: CreateCategoryInput): Promise<Category> {
    const body = { name: input.name } satisfies CreateCategoryRequestBody
    const dto = await this.httpClient.post(CATEGORIES_URL, body, decodeCategoryDto)
    return mapCategoryDtoToDomain(dto)
  }

  async update(
    _tenantContext: TenantContext,
    id: string,
    input: UpdateCategoryInput,
  ): Promise<Category> {
    const body: UpdateCategoryRequestBody = { categoryId: id, name: input.name }
    const dto = await this.httpClient.put(`${CATEGORIES_URL}/${id}`, body, decodeCategoryDto)
    return mapCategoryDtoToDomain(dto)
  }

  async delete(_tenantContext: TenantContext, id: string): Promise<void> {
    await this.httpClient.delete(`${CATEGORIES_URL}/${id}`)
  }
}
