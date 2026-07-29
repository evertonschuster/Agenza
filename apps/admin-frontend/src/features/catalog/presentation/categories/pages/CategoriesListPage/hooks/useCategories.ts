import { useCallback } from 'react'
import { useAppContainer } from '@/app/providers/useAppContainer'
import { useAsync, toUiAsyncState, type AsyncState } from '@/shared/presentation/hooks/useAsync'
import type { UiError } from '@/shared/application/UiError'
import type { Category } from '@/features/catalog/domain/entities/Category'
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from '@/features/catalog/application/repositories/CategoryRepository'

export interface UseCategoriesResult {
  categories: readonly Category[]
  listState: AsyncState<readonly Category[], UiError>
  refetch: () => Promise<void>
  createCategory: (input: CreateCategoryInput) => Promise<Category>
  updateCategory: (id: string, input: UpdateCategoryInput) => Promise<Category>
  deleteCategory: (id: string) => Promise<void>
}

export function useCategories(search = ''): UseCategoriesResult {
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

  return {
    categories: data ?? [],
    listState: toUiAsyncState(asyncState),
    refetch: async () => {
      await execute()
    },
    createCategory,
    updateCategory,
    deleteCategory,
  }
}
