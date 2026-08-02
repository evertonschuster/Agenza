import type { Category } from '@/features/catalog/domain/entities/Category'
import type { AsyncState } from '@/shared/presentation/hooks/useAsync'
import type { UiError } from '@/shared/application/UiError'

export interface UseCategoriesListPageResult {
  categories: readonly Category[]
  listState: AsyncState<readonly Category[], UiError>
  onRetry: () => void
  onDelete: (category: Category) => void
  deleteDialog: {
    target: Category | null
    error: string | null
    isDeleting: boolean
    onCancel: () => void
    onConfirm: () => void
  }
}
