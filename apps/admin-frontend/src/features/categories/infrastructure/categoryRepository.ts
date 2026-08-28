import { ok } from '@/shared/result';
import type { ApiResult } from '@/shared/api/apiProblem';
import type { components } from '@/shared/api/generated/services-api.d.ts';
import { servicesApi } from '@/app/servicesApi';

export interface Category {
  id: string;
  name: string;
}

export interface CategoryListFilter {
  search?: string;
}

const toCategory = (dto: components['schemas']['CategoryResponse']): Category => ({
  id: dto.id,
  name: dto.name,
});

export const categoryRepository = {
  async list(filter: CategoryListFilter = {}): Promise<ApiResult<Category[]>> {
    const result = await servicesApi.get('/api/v{version}/categories', {
      query: filter.search ? { Search: filter.search } : {},
    });
    return result.ok ? ok(result.data.map(toCategory)) : result;
  },

  async getById(id: string): Promise<ApiResult<Category>> {
    const result = await servicesApi.get('/api/v{version}/categories/{id}', { path: { id } });
    return result.ok ? ok(toCategory(result.data)) : result;
  },
};
