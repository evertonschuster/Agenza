import { useCallback, useEffect, useRef } from 'react'
import { useLocation, useResolvedPath } from 'react-router'
import { useAppContainer } from '@/app/providers/useAppContainer'
import { useAsync, toUiAsyncState } from '@/shared/presentation/hooks/useAsync'
import { useCategoryDeletion } from '@/features/catalog/presentation/categories/pages/CategoriesListPage/hooks/useCategoryDeletion'
import type { Category } from '@/features/catalog/domain/entities/Category'
import type { UseCategoriesListPageResult } from '@/features/catalog/presentation/categories/pages/CategoriesListPage/hooks/useCategoriesListPage.types'

export function useCategoriesListPage(search: string): UseCategoriesListPageResult {
  const { catalog } = useAppContainer()

  const listCategories = useCallback(async (): Promise<Category[]> => {
    const result = await catalog.listCategories.execute({ search })
    if (!result.success) {
      throw result.error
    }
    return result.value
  }, [catalog, search])

  const asyncState = useAsync(listCategories)
  const { data, execute } = asyncState
  const categories = data ?? []
  const listState = toUiAsyncState(asyncState)

  const deleteCategory = useCallback(
    async (id: string): Promise<void> => {
      const deleteResult = await catalog.deleteCategory.execute(id)
      if (!deleteResult.success) {
        throw deleteResult.error
      }
      await execute()
    },
    [catalog, execute],
  )

  const deletion = useCategoryDeletion({ onDelete: deleteCategory })

  const basePath = useResolvedPath('.').pathname
  const location = useLocation()
  const wasOnChildRoute = useRef(false)
  useEffect(() => {
    const onChildRoute = location.pathname !== basePath
    if (wasOnChildRoute.current && !onChildRoute) {
      void execute()
    }
    wasOnChildRoute.current = onChildRoute
    // Only the route transition matters here - execute()'s identity also
    // changes on every `search` update, which would refire this effect on
    // each keystroke if listed as a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, basePath])

  return {
    categories,
    listState,
    onRetry: () => void execute(),
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
