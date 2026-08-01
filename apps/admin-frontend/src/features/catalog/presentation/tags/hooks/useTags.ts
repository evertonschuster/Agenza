import { useCallback } from 'react'
import { useAppContainer } from '@/app/providers/useAppContainer'
import { useAsync, toUiAsyncState, type AsyncState } from '@/shared/presentation/hooks/useAsync'
import type { UiError } from '@/shared/application/UiError'
import { AppError } from '@/shared/application/AppError'
import { failure, success, type Result } from '@/shared/application/Result'
import type { Tag } from '@/features/catalog/domain/entities/Tag'
import type { TenantContext } from '@/features/auth'
import type {
  CreateTagInput,
  UpdateTagInput,
} from '@/features/catalog/application/repositories/TagRepository'

export interface UseTagsResult {
  tags: readonly Tag[]
  listState: AsyncState<readonly Tag[], UiError>
  refetch: () => Promise<void>
  createTag: (input: CreateTagInput) => Promise<Result<Tag, AppError>>
  updateTag: (id: string, input: UpdateTagInput) => Promise<Result<Tag, AppError>>
  deleteTag: (id: string) => Promise<Result<void, AppError>>
}

// tenantContext is nullable: the page can mount before useAuth() resolves -
// create/update/delete are never reachable from the UI in that window, but
// this keeps the guard a Result instead of a throw for that same reason
// useCategoryEditor's own unreachable guard is.
const NO_TENANT_CONTEXT_ERROR = new AppError({
  code: 'unexpected',
  message: 'Não é possível concluir esta ação sem um contexto de tenant autenticado.',
  retryable: false,
})

// tenantContext is nullable: the page can mount before useAuth() resolves.
// Guards below no-op until it does, then the changed identity re-triggers the fetch.
export function useTags(tenantContext: TenantContext | null, search = ''): UseTagsResult {
  const { catalog } = useAppContainer()

  const listTags = useCallback((): Promise<Result<Tag[], AppError>> => {
    if (tenantContext === null) {
      return Promise.resolve(success([]))
    }
    return catalog.listTags.execute({ search })
  }, [tenantContext, catalog, search])

  const asyncState = useAsync(listTags, { resetKey: tenantContext?.tenant.id })
  const { data, execute, mutate, captureGeneration } = asyncState

  const createTag = useCallback(
    async (input: CreateTagInput): Promise<Result<Tag, AppError>> => {
      if (tenantContext === null) {
        return failure(NO_TENANT_CONTEXT_ERROR)
      }
      // Captured before the POST starts: if the tenant switches while this
      // request is in flight, the mutate below must not insert tenant A's
      // newly created tag into what is now tenant B's list.
      const generation = captureGeneration()
      const createResult = await catalog.createTag.execute(input)
      if (createResult.success) {
        // Insert immediately so the new tag is selectable and shows up as
        // soon as the POST succeeds - the mutation's success never depends
        // on the background refetch below. If that refetch fails, this
        // optimistic entry is what keeps the tag visible as a chip (see
        // useAsync's own status/error, surfaced separately by the page).
        mutate(current => [...(current ?? []), createResult.value], generation)
        void execute()
      }
      return createResult
    },
    [tenantContext, catalog, execute, mutate, captureGeneration],
  )

  const updateTag = useCallback(
    async (id: string, input: UpdateTagInput): Promise<Result<Tag, AppError>> => {
      if (tenantContext === null) {
        return failure(NO_TENANT_CONTEXT_ERROR)
      }
      const updateResult = await catalog.updateTag.execute(id, input)
      if (updateResult.success) {
        await execute()
      }
      return updateResult
    },
    [tenantContext, catalog, execute],
  )

  const deleteTag = useCallback(
    async (id: string): Promise<Result<void, AppError>> => {
      if (tenantContext === null) {
        return failure(NO_TENANT_CONTEXT_ERROR)
      }
      const deleteResult = await catalog.deleteTag.execute(id)
      if (deleteResult.success) {
        await execute()
      }
      return deleteResult
    },
    [tenantContext, catalog, execute],
  )

  return {
    tags: data ?? [],
    listState: toUiAsyncState(asyncState),
    refetch: async () => {
      await execute()
    },
    createTag,
    updateTag,
    deleteTag,
  }
}
