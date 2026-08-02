import type { Tag } from '@/features/catalog/domain/entities/Tag'
import type {
  CreateTagInput,
  ListAllTagsOptions,
  TagRepository,
  UpdateTagInput,
} from '@/features/catalog/application/repositories/TagRepository'
import type { HttpClient } from '@/shared/application/HttpClient'
import type { AppError } from '@/shared/application/AppError'
import { flatMapResult, combineResults, type Result } from '@/shared/application/Result'
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

// Tenant scope travels in the X-Tenant-Id header the HttpClient attaches -
// no tenantContext parameter here, matching TagRepository's contract.
export class ApiTagRepository implements TagRepository {
  private readonly httpClient: HttpClient

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient
  }

  async listAll(options: ListAllTagsOptions = {}): Promise<Result<Tag[], AppError>> {
    const query = new URLSearchParams()
    if (options.search !== undefined && options.search.trim() !== '') {
      query.set('search', options.search.trim())
    }
    const suffix = query.toString() === '' ? '' : `?${query.toString()}`
    const result = await this.httpClient.get(`${TAGS_URL}${suffix}`, decodeTagDtoArray)
    return flatMapResult(result, dtos => combineResults(dtos.map(mapTagDtoToDomain)))
  }

  async create(input: CreateTagInput): Promise<Result<Tag, AppError>> {
    const body = {
      name: input.name,
      color: input.color,
      description: input.description ?? null,
    } satisfies CreateTagRequestBody
    const result = await this.httpClient.post(TAGS_URL, body, decodeTagDto)
    return flatMapResult(result, mapTagDtoToDomain)
  }

  async update(id: string, input: UpdateTagInput): Promise<Result<Tag, AppError>> {
    const body: UpdateTagRequestBody = {
      tagId: id,
      name: input.name,
      color: input.color,
      description: input.description ?? null,
    }
    const result = await this.httpClient.put(`${TAGS_URL}/${id}`, body, decodeTagDto)
    return flatMapResult(result, mapTagDtoToDomain)
  }

  async delete(id: string): Promise<Result<void, AppError>> {
    return this.httpClient.delete(`${TAGS_URL}/${id}`)
  }
}
