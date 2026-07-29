import type { Category } from '@/features/catalog/domain/entities/Category'
import type {
  CategoryRepository,
  CreateCategoryInput,
  ListAllCategoriesOptions,
  UpdateCategoryInput,
} from '@/features/catalog/application/repositories/CategoryRepository'
import type { HttpClient } from '@/shared/application/HttpClient'
import type { AppError } from '@/shared/application/AppError'
import { mapResult, type Result } from '@/shared/application/Result'
import {
  mapCategoryDtoToDomain,
  decodeCategoryDto,
  decodeCategoryDtoArray,
} from '@/features/catalog/infrastructure/mappers/categoryMapper'
import type { components } from '@/features/catalog/infrastructure/generated/services-api'

const CATEGORIES_URL = '/api/v1/categories'

type CreateCategoryRequestBody = components['schemas']['CreateCategoryCommand']
type UpdateCategoryRequestBody = components['schemas']['UpdateCategoryCommand']


export class ApiCategoryRepository implements CategoryRepository {
  private readonly httpClient: HttpClient

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient
  }

  async listAll(options: ListAllCategoriesOptions = {}): Promise<Result<Category[], AppError>> {
    const query = new URLSearchParams()
    if (options.search !== undefined && options.search.trim() !== '') {
      query.set('search', options.search.trim())
    }
    const suffix = query.toString() === '' ? '' : `?${query.toString()}`
    const result = await this.httpClient.get(`${CATEGORIES_URL}${suffix}`, decodeCategoryDtoArray)
    return mapResult(result, dtos => dtos.map(mapCategoryDtoToDomain))
  }

  async create(input: CreateCategoryInput): Promise<Result<Category, AppError>> {
    const body = { name: input.name } satisfies CreateCategoryRequestBody
    const result = await this.httpClient.post(CATEGORIES_URL, body, decodeCategoryDto)
    return mapResult(result, mapCategoryDtoToDomain)
  }

  async update(id: string, input: UpdateCategoryInput): Promise<Result<Category, AppError>> {
    const body: UpdateCategoryRequestBody = { categoryId: id, name: input.name }
    const result = await this.httpClient.put(`${CATEGORIES_URL}/${id}`, body, decodeCategoryDto)
    return mapResult(result, mapCategoryDtoToDomain)
  }

  async delete(id: string): Promise<Result<void, AppError>> {
    return this.httpClient.delete(`${CATEGORIES_URL}/${id}`)
  }
}
