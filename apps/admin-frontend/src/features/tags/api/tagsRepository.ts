import { servicesApi } from '@/shared/api/servicesApi';
import { ok } from '@/shared/result';
import type { ApiResult } from '@/shared/api/servicesFacade';
import type { Tag, TagInput } from '../model/tag';

async function list(search?: string, signal?: AbortSignal): Promise<ApiResult<Tag[]>> {
  const tags: Tag[] = [];
  let page = 1;

  while (true) {
    const result = await servicesApi.get('/api/v{version}/tags', {
      query: { Page: page, PageSize: 100, ...(search ? { Search: search } : {}) },
      signal,
    });

    if (!result.ok) return result;

    const tagsPage = result.data;
    tags.push(...tagsPage.items);
    const lastItem = tagsPage.page * tagsPage.pageSize;

    if (lastItem >= tagsPage.totalCount || tagsPage.items.length === 0) {
      return ok(tags);
    }

    page += 1;
  }
}

function get(id: string): Promise<ApiResult<Tag>> {
  return servicesApi.get('/api/v{version}/tags/{id}', { path: { id } });
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

export const tagsRepository = { list, get, create, update, delete: deleteTag };
