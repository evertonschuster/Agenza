import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useAppContainer } from '@/app/providers/useAppContainer'
import { useAsync } from '@/shared/presentation/hooks/useAsync'
import { AppError } from '@/shared/application/AppError'
import { toUiError } from '@/shared/application/UiError'
import { failure, type Result } from '@/shared/application/Result'
import type { Category } from '@/features/catalog/domain/entities/Category'
import type {
  CategoryFormField,
  CategoryFormValues,
} from '@/features/catalog/presentation/categories/pages/CategoryEditorDialog/forms/CategoryForm.types'
import {
  categoryCodeFieldMap,
  categoryFieldMap,
} from '@/features/catalog/presentation/categories/pages/CategoryEditorDialog/forms/categoryFieldMaps'
import {
  mapApiErrorToForm,
  type ServerFormError,
} from '@/shared/presentation/forms/serverFormError'
import type {
  CategoryEditorContent,
  UseCategoryEditorResult,
} from '@/features/catalog/presentation/categories/pages/CategoryEditorDialog/hooks/useCategoryEditor.types'

const EMPTY_FORM_VALUES: CategoryFormValues = { name: '' }

// immediate: isEditing keeps this unreachable in practice - it only exists
// to satisfy useAsync's Result-returning contract without a throw.
const MISSING_CATEGORY_ID_ERROR = new AppError({
  code: 'unexpected',
  message: 'Categoria não informada.',
  retryable: false,
})

export function useCategoryEditor(): UseCategoryEditorResult {
  const { id: categoryId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { catalog } = useAppContainer()
  const isEditing = categoryId !== undefined

  const fetchCategory = useCallback((): Promise<Result<Category, AppError>> => {
    if (categoryId === undefined) {
      return Promise.resolve(failure(MISSING_CATEGORY_ID_ERROR))
    }
    return catalog.getCategory.execute(categoryId)
  }, [catalog, categoryId])

  const categoryState = useAsync(fetchCategory, { immediate: isEditing })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<ServerFormError<CategoryFormField> | null>(null)

  function closeEditor(): void {
    void navigate('..', { replace: true })
  }

  async function onSubmit(values: CategoryFormValues): Promise<void> {
    setIsSubmitting(true)
    setServerError(null)
    const result =
      categoryId === undefined
        ? await catalog.createCategory.execute({ name: values.name })
        : await catalog.updateCategory.execute(categoryId, { name: values.name })
    if (result.success) {
      closeEditor()
    } else {
      setServerError(
        mapApiErrorToForm(
          result.error,
          categoryFieldMap,
          categoryCodeFieldMap,
          isEditing
            ? 'Não foi possível salvar a categoria.'
            : 'Não foi possível criar a categoria.',
        ),
      )
    }
    setIsSubmitting(false)
  }

  let content: CategoryEditorContent
  if (!isEditing) {
    content = { status: 'ready', initialValues: EMPTY_FORM_VALUES }
  } else if (categoryState.status === 'idle' || categoryState.status === 'loading') {
    content = { status: 'loading' }
  } else if (categoryState.status === 'initialError') {
    const error = categoryState.error
    content =
      error.code === 'notFound'
        ? { status: 'notFound' }
        : {
            status: 'loadError',
            message: toUiError(error).message,
            onRetry: () => void categoryState.execute(),
          }
  } else {
    content = { status: 'ready', initialValues: { name: categoryState.data.name } }
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
