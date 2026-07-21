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
  const { useCases } = useAppContainer()

  const listCategories = useCallback(async (): Promise<Category[]> => {
    if (tenantContext === null) {
      return []
    }
    return useCases.listCategories.execute(tenantContext, { search })
  }, [tenantContext, useCases, search])

  const { data, status, error, execute } = useAsync(listCategories)

  const createCategory = useCallback(
    async (input: CreateCategoryInput): Promise<Category> => {
      if (tenantContext === null) {
        throw new Error('Não é possível criar uma categoria sem um contexto de tenant autenticado')
      }
      const category = await useCases.createCategory.execute(tenantContext, input)
      await execute()
      return category
    },
    [tenantContext, useCases, execute],
  )

  const updateCategory = useCallback(
    async (id: string, input: UpdateCategoryInput): Promise<Category> => {
      if (tenantContext === null) {
        throw new Error(
          'Não é possível atualizar uma categoria sem um contexto de tenant autenticado',
        )
      }
      const category = await useCases.updateCategory.execute(tenantContext, id, input)
      await execute()
      return category
    },
    [tenantContext, useCases, execute],
  )

  const deleteCategory = useCallback(
    async (id: string): Promise<void> => {
      if (tenantContext === null) {
        throw new Error(
          'Não é possível excluir uma categoria sem um contexto de tenant autenticado',
        )
      }
      await useCases.deleteCategory.execute(tenantContext, id)
      await execute()
    },
    [tenantContext, useCases, execute],
  )

  return {
    categories: data ?? [],
    status,
    error,
    refetch: execute,
    createCategory,
    updateCategory,
    deleteCategory,
  }
}
