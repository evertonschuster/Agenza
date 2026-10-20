import { servicesApi } from '@/shared/api/servicesApi';
import type { ApiResult } from '@/shared/api/servicesFacade';
import type { Paging } from '@/shared/pagination/paging';
import type { Tag, TagInput } from '../model/tag';
import type { TagList } from '../model/tagList';
import type { TagListFilters } from '../model/tagListFilters';

export type TagListQuery = TagListFilters & Paging;

function list(
  { search, page, pageSize }: TagListQuery,
  signal?: AbortSignal,
): Promise<ApiResult<TagList>> {
  return servicesApi.get('/api/v{version}/tags', {
    query: { Page: page, PageSize: pageSize, ...(search ? { Search: search } : {}) },
    signal,
  });
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
