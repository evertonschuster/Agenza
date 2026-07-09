import type { Tag } from '../../domain/entities/Tag'
import type {
  CreateTagInput,
  TagRepository,
  UpdateTagInput,
} from '../../application/repositories/TagRepository'
import type { HttpClient } from '../../application/ports/HttpClient'
import type { TenantContext } from '../../application/context/TenantContext'
import { mapTagDtoToDomain, type TagDto } from '../mappers/tagMapper'

const TAGS_URL = '/api/v1/tags'

/**
 * The /api/v1/tags contract from docs/API.md. Tenant scope travels in
 * the JWT the HttpClient attaches - tenantContext is accepted (structural
 * enforcement, see admin-feature-vertical skill) but never sent as a
 * separate header or query param.
 */
export class ApiTagRepository implements TagRepository {
  private readonly httpClient: HttpClient

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient
  }

  async listAll(_tenantContext: TenantContext): Promise<Tag[]> {
    const dtos = await this.httpClient.get<TagDto[]>(TAGS_URL)
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
