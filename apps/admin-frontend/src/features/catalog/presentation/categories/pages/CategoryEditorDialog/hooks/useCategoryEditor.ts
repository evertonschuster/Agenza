import { useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router'
import type {
  CategoryFormField,
  CategoryFormValues,
} from '@/features/catalog/presentation/categories/pages/CategoryEditorDialog/forms/CategoryForm.types'
import {
  categoryCodeFieldMap,
  categoryFieldMap,
} from '@/features/catalog/presentation/categories/pages/CategoryEditorDialog/forms/categoryFieldMaps'
import type { UseCategoriesResult } from '@/features/catalog/presentation/categories/pages/CategoriesListPage/hooks/useCategories'
import { mapApiErrorToForm, type ServerFormError } from '@/shared/presentation/forms/serverFormError'
import type {
  CategoryEditorContent,
  UseCategoryEditorResult,
} from '@/features/catalog/presentation/categories/pages/CategoryEditorDialog/hooks/useCategoryEditor.types'

const EMPTY_FORM_VALUES: CategoryFormValues = { name: '' }

export function useCategoryEditor(): UseCategoryEditorResult {
  const { id: categoryId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { categories, listState, refetch, createCategory, updateCategory } =
    useOutletContext<UseCategoriesResult>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<ServerFormError<CategoryFormField> | null>(null)
  const isEditing = categoryId !== undefined

  function closeEditor(): void {
    void navigate('..', { replace: true })
  }

  async function onSubmit(values: CategoryFormValues): Promise<void> {
    setIsSubmitting(true)
    setServerError(null)
    try {
      if (categoryId === undefined) {
        await createCategory({ name: values.name })
      } else {
        await updateCategory(categoryId, { name: values.name })
      }
      closeEditor()
    } catch (caughtError) {
      setServerError(
        mapApiErrorToForm(
          caughtError,
          categoryFieldMap,
          categoryCodeFieldMap,
          isEditing
            ? 'Não foi possível salvar a categoria.'
            : 'Não foi possível criar a categoria.',
        ),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  let content: CategoryEditorContent
  if (!isEditing) {
    content = { status: 'ready', initialValues: EMPTY_FORM_VALUES }
  } else if (listState.status === 'idle' || listState.status === 'loading') {
    content = { status: 'loading' }
  } else if (listState.status === 'initialError') {
    content = {
      status: 'loadError',
      message: listState.error.message,
      onRetry: () => void refetch(),
    }
  } else {
    const category = categories.find(item => item.id === categoryId)
    content =
      category === undefined
        ? { status: 'notFound' }
        : { status: 'ready', initialValues: { name: category.name } }
  }

  return {
    title: isEditing ? 'Editar categoria' : 'Nova categoria',
    submitLabel: isEditing ? 'Salvar alterações' : 'Criar categoria',
    formKey: categoryId ?? 'new',
    content,
    isSubmitting,
    serverError,
    onCancel: closeEditor,
    onSubmit,
  }
}
