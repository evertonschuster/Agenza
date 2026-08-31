import type { ApiResult } from '@/shared/api/servicesFacade';
import { servicesApi } from '@/app/servicesApi';

export interface Category {
  id: string;
  name: string;
}

interface CategoryListOptions {
  search?: string;
  signal?: AbortSignal;
}

export const categoryRepository = {
  list: ({ search, signal }: CategoryListOptions = {}): Promise<ApiResult<Category[]>> =>
    servicesApi.get('/api/v{version}/categories', {
      query: search ? { Search: search } : {},
      signal,
    }),

  create: (name: string): Promise<ApiResult<Category>> =>
    servicesApi.post('/api/v{version}/categories', { body: { name } }),

  update: (id: string, name: string): Promise<ApiResult<Category>> =>
    servicesApi.put('/api/v{version}/categories/{id}', {
      path: { id },
      body: { categoryId: id, name },
    }),
};
