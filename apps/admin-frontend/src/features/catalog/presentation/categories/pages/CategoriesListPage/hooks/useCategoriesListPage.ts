import { useCallback } from 'react'
import { useAppContainer } from '@/app/providers/useAppContainer'
import { useAsync, toUiAsyncState } from '@/shared/presentation/hooks/useAsync'
import { useCategoryDeletion } from '@/features/catalog/presentation/categories/pages/CategoriesListPage/hooks/useCategoryDeletion'
import type { Category } from '@/features/catalog/domain/entities/Category'
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from '@/features/catalog/application/repositories/CategoryRepository'
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
  const { data, execute, mutate, captureGeneration } = asyncState
  const categories = data ?? []
  const listState = toUiAsyncState(asyncState)

  const createCategory = useCallback(
    async (input: CreateCategoryInput): Promise<Category> => {
      // Captured before the POST starts, mirroring useTags: if a background
      // refetch from a stale request lands after this one, the mutate below
      // must not apply on top of it.
      const generation = captureGeneration()
      const createResult = await catalog.createCategory.execute(input)
      if (!createResult.success) {
        throw createResult.error
      }
      const category = createResult.value
      mutate(current => [...(current ?? []), category], generation)
      void execute()
      return category
    },
    [catalog, execute, mutate, captureGeneration],
  )

  const updateCategory = useCallback(
    async (id: string, input: UpdateCategoryInput): Promise<Category> => {
      const updateResult = await catalog.updateCategory.execute(id, input)
      if (!updateResult.success) {
        throw updateResult.error
      }
      await execute()
      return updateResult.value
    },
    [catalog, execute],
  )

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
    editorContext: {
      categories,
      listState,
      refetch: async () => {
        await execute()
      },
      createCategory,
      updateCategory,
    },
  }
}
