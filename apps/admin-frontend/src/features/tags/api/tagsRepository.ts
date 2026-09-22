import { servicesApi } from '@/shared/api/servicesApi';
import type { ApiResult } from '@/shared/api/servicesFacade';
import type { Tag } from '../model/tag';

interface TagInput {
  name: string;
  color: string;
  description: string | null;
}

function list(search?: string, signal?: AbortSignal): Promise<ApiResult<Tag[]>> {
  return servicesApi.get('/api/v{version}/tags', {
    query: search ? { Search: search } : undefined,
    signal,
  });
}

function create(input: TagInput): Promise<ApiResult<Tag>> {
  return servicesApi.post('/api/v{version}/tags', { body: input });
}

function update(id: string, input: TagInput): Promise<ApiResult<Tag>> {
  return servicesApi.put('/api/v{version}/tags/{id}', {
    path: { id },
    body: { tagId: id, ...input },
  });
}

function deleteTag(id: string): Promise<ApiResult<void>> {
  return servicesApi.del('/api/v{version}/tags/{id}', { path: { id } });
}

export const tagsRepository = { list, create, update, delete: deleteTag };
