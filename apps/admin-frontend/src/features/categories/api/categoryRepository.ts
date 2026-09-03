import type { ApiResult } from '@/shared/api/servicesFacade';
import { servicesApi } from '@/shared/api/servicesApi';
import type { Category } from '../model/category';

interface CategoryListFilter {
  search?: string;
}

export const categoryRepository = {
  list: (filter: CategoryListFilter = {}): Promise<ApiResult<Category[]>> =>
    servicesApi.get('/api/v{version}/categories', {
      query: filter.search ? { Search: filter.search } : {},
    }),

  create: (name: string): Promise<ApiResult<Category>> =>
    servicesApi.post('/api/v{version}/categories', { body: { name } }),

  update: (id: string, name: string): Promise<ApiResult<Category>> =>
    servicesApi.put('/api/v{version}/categories/{id}', {
      path: { id },
      body: { categoryId: id, name },
    }),
};
