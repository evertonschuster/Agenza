import type { Tag } from '../../domain/entities/Tag'
import type {
  CreateTagInput,
  ListAllTagsOptions,
  TagRepository,
  UpdateTagInput,
} from '../../application/repositories/TagRepository'
import type { HttpClient } from '../../application/ports/HttpClient'
import type { TenantContext } from '../../application/context/TenantContext'
import { mapTagDtoToDomain, type TagDto } from '../mappers/tagMapper'

const TAGS_URL = '/api/v1/tags'

/**
 * The /api/v1/tags contract from docs/API.md. Tenant scope travels in
 * the X-Tenant-Id header the HttpClient attaches (verified server-side
 * against the JWT's tenant_id claim) - tenantContext is accepted here
 * only for structural enforcement (see admin-feature-vertical skill),
 * never read directly.
 */
export class ApiTagRepository implements TagRepository {
  private readonly httpClient: HttpClient

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient
  }

  async listAll(_tenantContext: TenantContext, options: ListAllTagsOptions = {}): Promise<Tag[]> {
    const query = new URLSearchParams()
    if (options.search !== undefined && options.search.trim() !== '') {
      query.set('search', options.search.trim())
    }
    const suffix = query.toString() === '' ? '' : `?${query.toString()}`
    const dtos = await this.httpClient.get<TagDto[]>(`${TAGS_URL}${suffix}`)
    return dtos.map(mapTagDtoToDomain)
  }

  async create(_tenantContext: TenantContext, input: CreateTagInput): Promise<Tag> {
    const dto = await this.httpClient.post<TagDto>(TAGS_URL, input)
    return mapTagDtoToDomain(dto)
  }

  async update(_tenantContext: TenantContext, id: string, input: UpdateTagInput): Promise<Tag> {
    const dto = await this.httpClient.put<TagDto>(`${TAGS_URL}/${id}`, input)
    return mapTagDtoToDomain(dto)
  }

  async delete(_tenantContext: TenantContext, id: string): Promise<void> {
    await this.httpClient.delete(`${TAGS_URL}/${id}`)
  }
}
