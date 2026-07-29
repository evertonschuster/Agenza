import { useCategories } from '@/features/catalog/presentation/categories/pages/CategoriesListPage/hooks/useCategories'
import { useCategoryDeletion } from '@/features/catalog/presentation/categories/pages/CategoriesListPage/hooks/useCategoryDeletion'
import type { UseCategoriesListPageResult } from '@/features/catalog/presentation/categories/pages/CategoriesListPage/hooks/useCategoriesListPage.types'

export function useCategoriesListPage(search: string): UseCategoriesListPageResult {
  const categoriesSource = useCategories(search)
  const { categories, listState, refetch, deleteCategory } = categoriesSource

  const deletion = useCategoryDeletion({ onDelete: deleteCategory })

  return {
    categories,
    listState,
    onRetry: () => void refetch(),
    onDelete: deletion.onRequestDelete,
    deleteDialog: {
      target: deletion.target,
      error: deletion.error,
      isDeleting: deletion.isDeleting,
      onCancel: deletion.onCancel,
      onConfirm: () => void deletion.onConfirm(),
    },
    editorContext: categoriesSource,
  }
}
