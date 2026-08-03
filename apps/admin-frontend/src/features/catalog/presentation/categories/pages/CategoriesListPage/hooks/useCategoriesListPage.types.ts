import type { Category } from '@/features/catalog/domain/entities/Category'
import type { AsyncState } from '@/shared/presentation/hooks/useAsync'
import type { UiError } from '@/shared/application/UiError'

export interface UseCategoriesListPageResult {
  categories: readonly Category[]
  listState: AsyncState<readonly Category[], UiError>
  onRetry: () => void
}
