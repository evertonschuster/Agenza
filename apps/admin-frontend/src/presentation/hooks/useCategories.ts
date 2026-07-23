import { useCallback } from 'react'
import { useAppContainer } from './useAppContainer'
import { useAsync } from './useAsync'
import type { Category } from '../../domain/entities/Category'
import type { TenantContext } from '../../application/context/TenantContext'
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from '../../application/repositories/CategoryRepository'

type UseCategoriesStatus = 'idle' | 'loading' | 'success' | 'error'

export interface UseCategoriesResult {
  categories: Category[]
  status: UseCategoriesStatus
  error: unknown
  refetch: () => Promise<void>
  createCategory: (input: CreateCategoryInput) => Promise<Category>
  updateCategory: (id: string, input: UpdateCategoryInput) => Promise<Category>
  deleteCategory: (id: string) => Promise<void>
}

/**
 * tenantContext is nullable because the page can mount while its own
 * useAuth() call is still resolving (same brief window AdminLayout
 * already tolerates for the business name). Guards below no-op until
 * it resolves, then the changed tenantContext identity re-triggers the
 * fetch automatically (see useAsync: execute's identity follows listCategories).
 */
export function useCategories(
  tenantContext: TenantContext | null,
  search = '',
): UseCategoriesResult {
  const { catalog } = useAppContainer()

  const listCategories = useCallback(async (): Promise<Category[]> => {
    if (tenantContext === null) {
      return []
    }
    return catalog.listCategories.execute(tenantContext, { search })
  }, [tenantContext, catalog, search])

  const { data, status, error, execute, mutate, captureGeneration } = useAsync(listCategories, {
    resetKey: tenantContext?.tenant.id,
  })

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
    status,
    error,
    refetch: async () => {
      await execute()
    },
    createCategory,
    updateCategory,
    deleteCategory,
  }
}
