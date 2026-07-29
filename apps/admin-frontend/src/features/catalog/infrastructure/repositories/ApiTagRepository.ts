import type { Tag } from '@/features/catalog/domain/entities/Tag'
import type {
  CreateTagInput,
  ListAllTagsOptions,
  TagRepository,
  UpdateTagInput,
} from '@/features/catalog/application/repositories/TagRepository'
import type { HttpClient } from '@/shared/application/HttpClient'
import type { TenantContext } from '@/features/auth'
import type { AppError } from '@/shared/application/AppError'
import { mapResult, type Result } from '@/shared/application/Result'
import {
  mapTagDtoToDomain,
  decodeTagDto,
  decodeTagDtoArray,
} from '@/features/catalog/infrastructure/mappers/tagMapper'
import type { components } from '@/features/catalog/infrastructure/generated/services-api'

// The route id is always keyed into the PUT body too (docs/adr/010, docs/adr/0007)
// so the two are structurally incapable of diverging.
type CreateTagRequestBody = components['schemas']['CreateTagCommand']
type UpdateTagRequestBody = components['schemas']['UpdateTagCommand']

const TAGS_URL = '/api/v1/tags'

// tenantContext is accepted for structural enforcement only - tenant scope
// travels in the X-Tenant-Id header the HttpClient attaches.
export class ApiTagRepository implements TagRepository {
  private readonly httpClient: HttpClient

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient
  }

  async listAll(
    _tenantContext: TenantContext,
    options: ListAllTagsOptions = {},
  ): Promise<Result<Tag[], AppError>> {
    const query = new URLSearchParams()
    if (options.search !== undefined && options.search.trim() !== '') {
      query.set('search', options.search.trim())
    }
    const suffix = query.toString() === '' ? '' : `?${query.toString()}`
    const result = await this.httpClient.get(`${TAGS_URL}${suffix}`, decodeTagDtoArray)
    return mapResult(result, dtos => dtos.map(mapTagDtoToDomain))
  }

  async create(
    _tenantContext: TenantContext,
    input: CreateTagInput,
  ): Promise<Result<Tag, AppError>> {
    const body = {
      name: input.name,
      color: input.color,
      description: input.description ?? null,
    } satisfies CreateTagRequestBody
    const result = await this.httpClient.post(TAGS_URL, body, decodeTagDto)
    return mapResult(result, mapTagDtoToDomain)
  }

  async update(
    _tenantContext: TenantContext,
    id: string,
    input: UpdateTagInput,
  ): Promise<Result<Tag, AppError>> {
    const body: UpdateTagRequestBody = {
      tagId: id,
      name: input.name,
      color: input.color,
      description: input.description ?? null,
    }
    const result = await this.httpClient.put(`${TAGS_URL}/${id}`, body, decodeTagDto)
    return mapResult(result, mapTagDtoToDomain)
  }

  async delete(_tenantContext: TenantContext, id: string): Promise<Result<void, AppError>> {
    return this.httpClient.delete(`${TAGS_URL}/${id}`)
  }
}
