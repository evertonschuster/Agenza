import type { Tag } from '../../domain/entities/Tag'
import type {
  CreateTagInput,
  TagRepository,
  UpdateTagInput,
} from '../../application/repositories/TagRepository'
import type { HttpClient } from '../../application/ports/HttpClient'
import type { TenantContext } from '../../application/context/TenantContext'
import { mapTagDtoToDomain, type TagDto } from '../mappers/tagMapper'

/**
 * The /api/tags contract from docs/API.md. Tenant scope travels in the
 * JWT the HttpClient attaches - tenantContext is accepted (structural
 * enforcement, see admin-feature-vertical skill) but never sent as a
 * separate header or query param.
 */
export class ApiTagRepository implements TagRepository {
  private readonly httpClient: HttpClient

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient
  }

  async listAll(_tenantContext: TenantContext): Promise<Tag[]> {
    const dtos = await this.httpClient.get<TagDto[]>('/api/tags')
    return dtos.map(mapTagDtoToDomain)
  }

  async create(_tenantContext: TenantContext, input: CreateTagInput): Promise<Tag> {
    const dto = await this.httpClient.post<TagDto>('/api/tags', input)
    return mapTagDtoToDomain(dto)
  }

  async update(_tenantContext: TenantContext, id: string, input: UpdateTagInput): Promise<Tag> {
    const dto = await this.httpClient.put<TagDto>(`/api/tags/${id}`, input)
    return mapTagDtoToDomain(dto)
  }

  async delete(_tenantContext: TenantContext, id: string): Promise<void> {
    await this.httpClient.delete(`/api/tags/${id}`)
  }
}
