import { servicesApi } from '@/shared/api/servicesApi';
import type { ApiResult } from '@/shared/api/servicesFacade';
import type { Tag } from '../model/tag';

function list(search?: string): Promise<ApiResult<Tag[]>> {
  return servicesApi.get('/api/v{version}/tags', {
    query: search ? { Search: search } : undefined,
  });
}

function deleteTag(id: string): Promise<ApiResult<void>> {
  return servicesApi.del('/api/v{version}/tags/{id}', { path: { id } });
}

export const tagsRepository = { list, delete: deleteTag };
