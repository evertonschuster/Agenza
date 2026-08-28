import { ok } from '@/shared/result';
import type { ApiResult } from '@/shared/api/apiFailure';
import type { components } from '@/shared/api/generated/services-api.d.ts';
import { servicesApi } from '@/app/servicesApi';

/** A service category as the admin app models it — decoupled from the services-service wire shape. */
export interface Category {
  id: string;
  name: string;
}

/** Filters ("recortes") accepted when listing categories. */
export interface CategoryListFilter {
  /** Free-text match on the category name. */
  search?: string;
}

const toCategory = (dto: components['schemas']['CategoryResponse']): Category => ({
  id: dto.id,
  name: dto.name,
});

/**
 * Read access to categories in services-service.
 *
 * Every call goes through `servicesApi`: the bearer token, the tenant header and the API version
 * are already handled, the response envelope is unwrapped, and failures arrive as `ApiResult`
 * values — this file never sets a header, unwraps a payload, or catches an exception.
 */
export const categoryRepository = {
  /** List categories, optionally narrowed by `filter`. */
  async list(filter: CategoryListFilter = {}): Promise<ApiResult<Category[]>> {
    const result = await servicesApi.get('/api/v{version}/categories', {
      query: filter.search ? { Search: filter.search } : {},
    });
    return result.ok ? ok(result.data.map(toCategory)) : result;
  },

  /** Load a single category by id. A missing category comes back as an `ApiFailure` of kind `not_found`. */
  async getById(id: string): Promise<ApiResult<Category>> {
    const result = await servicesApi.get('/api/v{version}/categories/{id}', { path: { id } });
    return result.ok ? ok(toCategory(result.data)) : result;
  },
};
