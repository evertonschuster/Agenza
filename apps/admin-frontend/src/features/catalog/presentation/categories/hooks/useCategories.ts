import { useCallback } from 'react'
import { useAppContainer } from '@/app/providers/useAppContainer'
import { useAsync, toUiAsyncState, type AsyncState } from '@/shared/presentation/hooks/useAsync'
import { success, failure, type Result } from '@/shared/application/Result'
import type { UiError } from '@/shared/application/UiError'
import type { Category } from '@/features/catalog/domain/entities/Category'
import type { TenantContext } from '@/features/auth'
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

// tenantContext is nullable: the page can mount before useAuth() resolves.
// Guards below no-op until it does, then the changed identity re-triggers the fetch.
export function useCategories(
  tenantContext: TenantContext | null,
  search = '',
): UseCategoriesResult {
  const { catalog } = useAppContainer()

  const listCategories = useCallback(async (): Promise<Result<Category[], unknown>> => {
    if (tenantContext === null) {
      return success([])
    }
    try {
      return success(await catalog.listCategories.execute(tenantContext, { search }))
    } catch (error) {
      return failure(error)
    }
  }, [tenantContext, catalog, search])

  const asyncState = useAsync(listCategories, { resetKey: tenantContext?.tenant.id })
  const { data, execute, mutate, captureGeneration } = asyncState

  const createCategory = useCallback(
    async (input: CreateCategoryInput): Promise<Category> => {
      if (tenantContext === null) {
        throw new Error('Não é possível criar uma categoria sem um contexto de tenant autenticado')
      }
      // Captured before the POST starts: if the tenant switches while this
      // request is in flight, the mutate below must not insert tenant A's
      // newly created category into what is now tenant B's list.
      const generation = captureGeneration()
      const category = await catalog.createCategory.execute(tenantContext, input)
      // Insert immediately so the new category is selectable and shows up
      // as soon as the POST succeeds - the mutation's success never
      // depends on the background refetch below. If that refetch fails,
      // this optimistic entry is what keeps the category visible (see
      // useAsync's own status/error, surfaced separately by the page).
      mutate(current => [...(current ?? []), category], generation)
      void execute()
      return category
    },
    [tenantContext, catalog, execute, mutate, captureGeneration],
  )

  const updateCategory = useCallback(
    async (id: string, input: UpdateCategoryInput): Promise<Category> => {
      if (tenantContext === null) {
        throw new Error(
          'Não é possível atualizar uma categoria sem um contexto de tenant autenticado',
        )
      }
      const category = await catalog.updateCategory.execute(tenantContext, id, input)
      await execute()
      return category
    },
    [tenantContext, catalog, execute],
  )

  const deleteCategory = useCallback(
    async (id: string): Promise<void> => {
      if (tenantContext === null) {
        throw new Error(
          'Não é possível excluir uma categoria sem um contexto de tenant autenticado',
        )
      }
      await catalog.deleteCategory.execute(tenantContext, id)
      await execute()
    },
    [tenantContext, catalog, execute],
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
