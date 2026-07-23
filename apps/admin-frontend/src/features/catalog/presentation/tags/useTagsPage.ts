import { useState } from 'react'
import { useAuth } from '@/features/auth'
import { useTags } from '@/features/catalog/presentation/useTags'
import { useDebouncedValue } from '@/shared/presentation/hooks/useDebouncedValue'
import { useDialogTarget } from '@/shared/presentation/hooks/useDialogTarget'
import { useDeleteConfirmation } from '@/shared/presentation/hooks/useDeleteConfirmation'
import { TAG_COLOR_PALETTE, type Tag, type TagColor } from '@/features/catalog/domain/entities/Tag'
import type { TagFormValues, TagFormField } from '@/features/catalog/presentation/forms/TagForm'
import {
  mapApiErrorToForm,
  type ServerFormError,
} from '@/shared/presentation/forms/serverFormError'
import { tagFieldMap, tagCodeFieldMap } from '@/features/catalog/presentation/forms/fieldMaps'

const EMPTY_FORM_VALUES: TagFormValues = { name: '', color: TAG_COLOR_PALETTE[0], description: '' }

function toTagInput(values: TagFormValues): {
  name: string
  color: TagColor
  description?: string
} {
  const description = values.description.trim()
  return {
    name: values.name,
    color: values.color,
    ...(description !== '' ? { description } : {}),
  }
}

function toFormValues(tag: Tag): TagFormValues {
  return { name: tag.name, color: tag.color, description: tag.description ?? '' }
}

export interface UseTagsPageResult {
  searchInput: string
  onSearchInputChange: (value: string) => void
  tags: Tag[]
  status: 'idle' | 'loading' | 'success' | 'error'
  error: unknown
  hasActiveSearch: boolean
  onRetry: () => void
  onOpenCreate: () => void
  onEdit: (tag: Tag) => void
  onDelete: (tag: Tag) => void
  dialog: {
    isOpen: boolean
    displayTarget: 'new' | Tag | null
    title: string
    submitLabel: string
    initialValues: TagFormValues
    isSubmitting: boolean
    serverError: ServerFormError<TagFormField> | null
    onCancel: () => void
    onSubmit: (values: TagFormValues) => Promise<void>
  }
  deleteDialog: {
    target: Tag | null
    error: string | null
    isDeleting: boolean
    onCancel: () => void
    onConfirm: () => void
  }
}

/** Composes search, useTags, dialog target, and delete confirmation into TagsPage's view models. */
export function useTagsPage(): UseTagsPageResult {
  const { tenantContext } = useAuth()
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebouncedValue(searchInput, 300)
  const { tags, status, error, refetch, createTag, updateTag, deleteTag } = useTags(
    tenantContext,
    debouncedSearch,
  )

  const dialogTarget = useDialogTarget<Tag>()
  const [serverError, setServerError] = useState<ServerFormError<TagFormField> | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const deletion = useDeleteConfirmation<Tag>({
    onDelete: tag => deleteTag(tag.id),
    fallbackMessage: 'Não foi possível excluir a etiqueta.',
  })

  function openCreateForm(): void {
    dialogTarget.openCreate()
    setServerError(null)
  }

  function openEditForm(tag: Tag): void {
    dialogTarget.openEdit(tag)
    setServerError(null)
  }

  function closeForm(): void {
    dialogTarget.close()
    setServerError(null)
  }

  async function handleSubmit(values: TagFormValues): Promise<void> {
    setIsSubmitting(true)
    setServerError(null)
    try {
      if (dialogTarget.formTarget === 'new') {
        await createTag(toTagInput(values))
      } else if (dialogTarget.formTarget !== null) {
        await updateTag(dialogTarget.formTarget.id, toTagInput(values))
      }
      closeForm()
    } catch (caughtError) {
      setServerError(
        mapApiErrorToForm(
          caughtError,
          tagFieldMap,
          tagCodeFieldMap,
          'Não foi possível salvar a etiqueta.',
        ),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const { displayTarget } = dialogTarget

  return {
    searchInput,
    onSearchInputChange: setSearchInput,
    tags,
    status,
    error,
    hasActiveSearch: debouncedSearch.trim() !== '',
    onRetry: () => void refetch(),
    onOpenCreate: openCreateForm,
    onEdit: openEditForm,
    onDelete: deletion.onRequestDelete,
    dialog: {
      isOpen: dialogTarget.isOpen,
      displayTarget,
      title:
        displayTarget === 'new' || displayTarget === null ? 'Nova etiqueta' : 'Editar etiqueta',
      submitLabel:
        displayTarget === 'new' || displayTarget === null ? 'Criar etiqueta' : 'Salvar alterações',
      initialValues:
        displayTarget === 'new' || displayTarget === null
          ? EMPTY_FORM_VALUES
          : toFormValues(displayTarget),
      isSubmitting,
      serverError,
      onCancel: closeForm,
      onSubmit: handleSubmit,
    },
    deleteDialog: {
      target: deletion.target,
      error: deletion.error,
      isDeleting: deletion.isDeleting,
      onCancel: deletion.onCancel,
      onConfirm: () => void deletion.onConfirm(),
    },
  }
}
