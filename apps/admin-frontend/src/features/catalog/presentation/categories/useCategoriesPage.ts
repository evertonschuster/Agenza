import { useState } from 'react'
import { useAuth } from '@/features/auth'
import { useCategories } from '@/features/catalog/presentation/useCategories'
import type { AsyncState } from '@/shared/presentation/hooks/useAsync'
import type { UiError } from '@/shared/application/UiError'
import { useDebouncedValue } from '@/shared/presentation/hooks/useDebouncedValue'
import { useDialogTarget, type DialogTarget } from '@/shared/presentation/hooks/useDialogTarget'
import { useDeleteConfirmation } from '@/shared/presentation/hooks/useDeleteConfirmation'
import type { Category } from '@/features/catalog/domain/entities/Category'
import type {
  CategoryFormValues,
  CategoryFormField,
} from '@/features/catalog/presentation/forms/CategoryForm'
import {
  mapApiErrorToForm,
  type ServerFormError,
} from '@/shared/presentation/forms/serverFormError'
import {
  categoryFieldMap,
  categoryCodeFieldMap,
} from '@/features/catalog/presentation/forms/fieldMaps'

const EMPTY_FORM_VALUES: CategoryFormValues = { name: '' }

function toCategoryInput(values: CategoryFormValues): { name: string } {
  return { name: values.name }
}

function toFormValues(category: Category): CategoryFormValues {
  return { name: category.name }
}

export type CategoryEditorContent =
  | { kind: 'create'; title: string; submitLabel: string; initialValues: CategoryFormValues }
  | {
      kind: 'edit'
      item: Category
      title: string
      submitLabel: string
      initialValues: CategoryFormValues
    }

function toEditorContent(target: DialogTarget<Category>): CategoryEditorContent {
  if (target.kind === 'edit') {
    return {
      kind: 'edit',
      item: target.item,
      title: 'Editar categoria',
      submitLabel: 'Salvar alterações',
      initialValues: toFormValues(target.item),
    }
  }
  return {
    kind: 'create',
    title: 'Nova categoria',
    submitLabel: 'Criar categoria',
    initialValues: EMPTY_FORM_VALUES,
  }
}

export interface UseCategoriesPageResult {
  searchInput: string
  onSearchInputChange: (value: string) => void
  categories: readonly Category[]
  listState: AsyncState<readonly Category[], UiError>
  hasActiveSearch: boolean
  onRetry: () => void
  onOpenCreate: () => void
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
  dialog: {
    isOpen: boolean
    content: CategoryEditorContent | null
    isSubmitting: boolean
    serverError: ServerFormError<CategoryFormField> | null
    onCancel: () => void
    onSubmit: (values: CategoryFormValues) => Promise<void>
  }
  deleteDialog: {
    target: Category | null
    error: string | null
    isDeleting: boolean
    onCancel: () => void
    onConfirm: () => void
  }
}

/** Composes search, useCategories, dialog target, and delete confirmation into CategoriesPage's view models. */
export function useCategoriesPage(): UseCategoriesPageResult {
  const { tenantContext } = useAuth()
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebouncedValue(searchInput, 300)
  const { categories, listState, refetch, createCategory, updateCategory, deleteCategory } =
    useCategories(tenantContext, debouncedSearch)

  const dialogTarget = useDialogTarget<Category>()
  const [serverError, setServerError] = useState<ServerFormError<CategoryFormField> | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const deletion = useDeleteConfirmation<Category>({
    onDelete: category => deleteCategory(category.id),
    fallbackMessage: 'Não foi possível excluir a categoria.',
  })

  function openCreateForm(): void {
    dialogTarget.openCreate()
    setServerError(null)
  }

  function openEditForm(category: Category): void {
    dialogTarget.openEdit(category)
    setServerError(null)
  }

  function closeForm(): void {
    dialogTarget.close()
    setServerError(null)
  }

  async function handleSubmit(values: CategoryFormValues): Promise<void> {
    setIsSubmitting(true)
    setServerError(null)
    try {
      if (dialogTarget.formTarget?.kind === 'create') {
        await createCategory(toCategoryInput(values))
      } else if (dialogTarget.formTarget?.kind === 'edit') {
        await updateCategory(dialogTarget.formTarget.item.id, toCategoryInput(values))
      }
      closeForm()
    } catch (caughtError) {
      setServerError(
        mapApiErrorToForm(
          caughtError,
          categoryFieldMap,
          categoryCodeFieldMap,
          'Não foi possível salvar a categoria.',
        ),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    searchInput,
    onSearchInputChange: setSearchInput,
    categories,
    listState,
    hasActiveSearch: debouncedSearch.trim() !== '',
    onRetry: () => void refetch(),
    onOpenCreate: openCreateForm,
    onEdit: openEditForm,
    onDelete: deletion.onRequestDelete,
    dialog: {
      isOpen: dialogTarget.isOpen,
      content:
        dialogTarget.displayTarget !== null ? toEditorContent(dialogTarget.displayTarget) : null,
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
