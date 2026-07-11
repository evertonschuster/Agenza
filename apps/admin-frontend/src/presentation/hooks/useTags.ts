import { useCallback } from 'react'
import { useAppContainer } from './useAppContainer'
import { useAsync } from './useAsync'
import type { Tag } from '../../domain/entities/Tag'
import type { TenantContext } from '../../application/context/TenantContext'
import type { CreateTagInput, UpdateTagInput } from '../../application/repositories/TagRepository'

type UseTagsStatus = 'idle' | 'loading' | 'success' | 'error'

export interface UseTagsResult {
  tags: Tag[]
  status: UseTagsStatus
  error: unknown
  refetch: () => Promise<void>
  createTag: (input: CreateTagInput) => Promise<Tag>
  updateTag: (id: string, input: UpdateTagInput) => Promise<Tag>
  deleteTag: (id: string) => Promise<void>
}

/**
 * tenantContext is nullable because the page can mount while its own
 * useAuth() call is still resolving (same brief window AdminLayout
 * already tolerates for the business name). Guards below no-op until
 * it resolves, then the changed tenantContext identity re-triggers the
 * fetch automatically (see useAsync: execute's identity follows listTags').
 */
export function useTags(tenantContext: TenantContext | null): UseTagsResult {
  const { useCases } = useAppContainer()

  const listTags = useCallback(async (): Promise<Tag[]> => {
    if (tenantContext === null) {
      return []
    }
    return useCases.listTags.execute(tenantContext)
  }, [tenantContext, useCases])

  const { data, status, error, execute } = useAsync(listTags)

  const createTag = useCallback(
    async (input: CreateTagInput): Promise<Tag> => {
      if (tenantContext === null) {
        throw new Error('Não é possível criar uma etiqueta sem um contexto de tenant autenticado')
      }
      const tag = await useCases.createTag.execute(tenantContext, input)
      await execute()
      return tag
    },
    [tenantContext, useCases, execute],
  )

  const updateTag = useCallback(
    async (id: string, input: UpdateTagInput): Promise<Tag> => {
      if (tenantContext === null) {
        throw new Error(
          'Não é possível atualizar uma etiqueta sem um contexto de tenant autenticado',
        )
      }
      const tag = await useCases.updateTag.execute(tenantContext, id, input)
      await execute()
      return tag
    },
    [tenantContext, useCases, execute],
  )

  const deleteTag = useCallback(
    async (id: string): Promise<void> => {
      if (tenantContext === null) {
        throw new Error('Não é possível excluir uma etiqueta sem um contexto de tenant autenticado')
      }
      await useCases.deleteTag.execute(tenantContext, id)
      await execute()
    },
    [tenantContext, useCases, execute],
  )

  return { tags: data ?? [], status, error, refetch: execute, createTag, updateTag, deleteTag }
}
