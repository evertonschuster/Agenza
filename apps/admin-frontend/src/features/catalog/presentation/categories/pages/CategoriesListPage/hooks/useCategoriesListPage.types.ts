import type { Category } from '@/features/catalog/domain/entities/Category'
import type { AppError } from '@/shared/application/AppError';

export interface UseCategoriesListPageResult {
  categories: Category[];
  loading: boolean;
  error: AppError | null;
  load: (search: string) => Promise<void>;
}
