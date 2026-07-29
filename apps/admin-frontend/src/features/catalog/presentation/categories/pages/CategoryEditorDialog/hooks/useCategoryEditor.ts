import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useAppContainer } from '@/app/providers/useAppContainer'
import type {
  CategoryFormField,
  CategoryFormValues,
} from '@/features/catalog/presentation/categories/pages/CategoryEditorDialog/forms/CategoryForm.types'
import {
  categoryCodeFieldMap,
  categoryFieldMap,
} from '@/features/catalog/presentation/categories/pages/CategoryEditorDialog/forms/categoryFieldMaps'
import { mapApiErrorToForm, type ServerFormError } from '@/shared/presentation/forms/serverFormError'
import type {
  CategoriesLoadState,
  CategoryEditorContent,
  UseCategoryEditorResult,
} from '@/features/catalog/presentation/categories/pages/CategoryEditorDialog/hooks/useCategoryEditor.types'

const EMPTY_FORM_VALUES: CategoryFormValues = { name: '' }

export function useCategoryEditor(): UseCategoryEditorResult {
  const { id: categoryId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { catalog } = useAppContainer()
  const [loadState, setLoadState] = useState<CategoriesLoadState>({ status: 'loading' })
  const latestRequestRef = useRef(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<ServerFormError<CategoryFormField> | null>(null)
  const isEditing = categoryId !== undefined

  const fetchCategories = useCallback(async (): Promise<void> => {
    const requestId = ++latestRequestRef.current
    setLoadState({ status: 'loading' })
    const result = await catalog.listCategories.execute()
    if (requestId !== latestRequestRef.current) {
      return
    }
    setLoadState(
      result.success
        ? { status: 'success', categories: result.value }
        : { status: 'error', message: result.error.message },
    )
  }, [catalog])

  useEffect(() => {
    void fetchCategories()
  }, [fetchCategories])

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
  } else if (loadState.status === 'loading') {
    content = { status: 'loading' }
  } else if (loadState.status === 'error') {
    content = {
      status: 'loadError',
      message: loadState.message,
      onRetry: () => void fetchCategories(),
    }
  } else {
    const category = loadState.categories.find(item => item.id === categoryId)
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
