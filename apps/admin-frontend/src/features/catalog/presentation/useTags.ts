import { useCallback } from 'react'
import { useAppContainer } from '@/app/providers/useAppContainer'
import { useAsync } from '@/shared/presentation/hooks/useAsync'
import type { Tag } from '@/features/catalog/domain/entities/Tag'
import type { TenantContext } from '@/features/auth'
import type {
  CreateTagInput,
  UpdateTagInput,
} from '@/features/catalog/application/repositories/TagRepository'

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
export function useTags(tenantContext: TenantContext | null, search = ''): UseTagsResult {
  const { catalog } = useAppContainer()

  const listTags = useCallback(async (): Promise<Tag[]> => {
    if (tenantContext === null) {
      return []
    }
    return catalog.listTags.execute(tenantContext, { search })
  }, [tenantContext, catalog, search])

  const { data, status, error, execute, mutate, captureGeneration } = useAsync(listTags, {
    resetKey: tenantContext?.tenant.id,
  })

  const createTag = useCallback(
    async (input: CreateTagInput): Promise<Tag> => {
      if (tenantContext === null) {
        throw new Error('Não é possível criar uma etiqueta sem um contexto de tenant autenticado')
      }
      // Captured before the POST starts: if the tenant switches while this
      // request is in flight, the mutate below must not insert tenant A's
      // newly created tag into what is now tenant B's list.
      const generation = captureGeneration()
      const tag = await catalog.createTag.execute(tenantContext, input)
      // Insert immediately so the new tag is selectable and shows up as
      // soon as the POST succeeds - the mutation's success never depends
      // on the background refetch below. If that refetch fails, this
      // optimistic entry is what keeps the tag visible as a chip (see
      // useAsync's own status/error, surfaced separately by the page).
      mutate(current => [...(current ?? []), tag], generation)
      void execute()
      return tag
    },
    [tenantContext, catalog, execute, mutate, captureGeneration],
  )

  const updateTag = useCallback(
    async (id: string, input: UpdateTagInput): Promise<Tag> => {
      if (tenantContext === null) {
        throw new Error(
          'Não é possível atualizar uma etiqueta sem um contexto de tenant autenticado',
        )
      }
      const tag = await catalog.updateTag.execute(tenantContext, id, input)
      await execute()
      return tag
    },
    [tenantContext, catalog, execute],
  )

  const deleteTag = useCallback(
    async (id: string): Promise<void> => {
      if (tenantContext === null) {
        throw new Error('Não é possível excluir uma etiqueta sem um contexto de tenant autenticado')
      }
      await catalog.deleteTag.execute(tenantContext, id)
      await execute()
    },
    [tenantContext, catalog, execute],
  )

  return {
    tags: data ?? [],
    status,
    error,
    refetch: async () => {
      await execute()
    },
    createTag,
    updateTag,
    deleteTag,
  }
}
