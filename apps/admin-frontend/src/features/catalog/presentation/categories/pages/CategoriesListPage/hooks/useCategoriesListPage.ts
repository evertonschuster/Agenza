import { useCallback, useEffect, useState } from 'react'
import { useAppContainer } from '@/app/providers/useAppContainer'
import { useCategoryDeletion } from '@/features/catalog/presentation/categories/pages/CategoriesListPage/hooks/useCategoryDeletion'
import type {
  CategoriesListState,
  UseCategoriesListPageResult,
} from '@/features/catalog/presentation/categories/pages/CategoriesListPage/hooks/useCategoriesListPage.types'

export function useCategoriesListPage(search: string): UseCategoriesListPageResult {
  const { catalog } = useAppContainer()
  const [state, setState] = useState<CategoriesListState>({ status: 'loading' })

  const fetchCategories = useCallback(async (): Promise<void> => {
    setState({ status: 'loading' })
    const result = await catalog.listCategories.execute({ search })
    setState(
      result.success
        ? { status: 'success', categories: result.value }
        : { status: 'error', message: result.error.message },
    )
  }, [catalog, search])

  useEffect(() => {
    void fetchCategories()
  }, [fetchCategories])

  const deletion = useCategoryDeletion({
    onDelete: async id => {
      const result = await catalog.deleteCategory.execute(id)
      if (!result.success) {
        throw result.error
      }
      await fetchCategories()
    },
  })

  return {
    state,
    onRetry: () => void fetchCategories(),
    onDelete: deletion.onRequestDelete,
    deleteDialog: {
      target: deletion.target,
      error: deletion.error,
      isDeleting: deletion.isDeleting,
      onCancel: deletion.onCancel,
      onConfirm: () => void deletion.onConfirm(),
    },
  }
}
