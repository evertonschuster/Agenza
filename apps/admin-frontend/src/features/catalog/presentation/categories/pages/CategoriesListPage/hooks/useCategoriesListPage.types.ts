import type { Category } from '@/features/catalog/domain/entities/Category'

export type CategoriesListState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; categories: readonly Category[] }

export interface UseCategoriesListPageResult {
  state: CategoriesListState
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
