import { useState } from 'react'
import { useAuth } from '@/features/auth'
import { useTags } from '@/features/catalog/presentation/tags/hooks/useTags'
import type { AsyncState } from '@/shared/presentation/hooks/useAsync'
import type { UiError } from '@/shared/application/UiError'
import { useDebouncedValue } from '@/shared/presentation/hooks/useDebouncedValue'
import { useDeleteConfirmation } from '@/shared/presentation/hooks/useDeleteConfirmation'
import type { Tag } from '@/features/catalog/domain/entities/Tag'
import type { UseTagsResult } from '@/features/catalog/presentation/tags/hooks/useTags'

export interface UseTagsPageResult {
  searchInput: string
  onSearchInputChange: (value: string) => void
  tags: readonly Tag[]
  listState: AsyncState<readonly Tag[], UiError>
  hasActiveSearch: boolean
  onRetry: () => void
  editorContext: UseTagsResult
  onDelete: (tag: Tag) => void
  deleteDialog: {
    target: Tag | null
    error: string | null
    isDeleting: boolean
    onCancel: () => void
    onConfirm: () => void
  }
}

export function useTagsPage(): UseTagsPageResult {
  const { tenantContext } = useAuth()
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebouncedValue(searchInput, 300)
  const tagsSource = useTags(tenantContext, debouncedSearch)
  const { tags, listState, refetch, deleteTag } = tagsSource
  const deletion = useDeleteConfirmation<Tag>({
    onDelete: tag => deleteTag(tag.id),
  })

  return {
    searchInput,
    onSearchInputChange: setSearchInput,
    tags,
    listState,
    hasActiveSearch: debouncedSearch.trim() !== '',
    onRetry: () => void refetch(),
    editorContext: tagsSource,
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
