import { useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router'
import type {
  TagFormField,
  TagFormValues,
} from '@/features/catalog/presentation/tags/forms/TagForm'
import {
  tagCodeFieldMap,
  tagFieldMap,
} from '@/features/catalog/presentation/tags/forms/tagFieldMaps'
import type { UseTagsResult } from '@/features/catalog/presentation/tags/hooks/useTags'
import {
  mapApiErrorToForm,
  type ServerFormError,
} from '@/shared/presentation/forms/serverFormError'
import { TAG_COLOR_PALETTE } from '@/features/catalog/domain/entities/Tag'

const EMPTY_FORM_VALUES: TagFormValues = {
  name: '',
  color: TAG_COLOR_PALETTE[0],
  description: '',
}

export type TagEditorContent =
  | { status: 'loading' }
  | { status: 'loadError'; message: string; onRetry: () => void }
  | { status: 'notFound' }
  | { status: 'ready'; initialValues: TagFormValues }

export interface UseTagEditorResult {
  title: string
  submitLabel: string
  formKey: string
  content: TagEditorContent
  isSubmitting: boolean
  serverError: ServerFormError<TagFormField> | null
  onCancel: () => void
  onSubmit: (values: TagFormValues) => Promise<void>
}

function toTagInput(values: TagFormValues): {
  name: string
  color: string
  description?: string
} {
  const description = values.description.trim()
  return {
    name: values.name,
    color: values.color,
    ...(description !== '' ? { description } : {}),
  }
}

export function useTagEditor(): UseTagEditorResult {
  const { id: tagId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { tags, listState, refetch, createTag, updateTag } = useOutletContext<UseTagsResult>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<ServerFormError<TagFormField> | null>(null)
  const isEditing = tagId !== undefined

  function closeEditor(): void {
    void navigate('..', { replace: true })
  }

  async function onSubmit(values: TagFormValues): Promise<void> {
    setIsSubmitting(true)
    setServerError(null)
    const result =
      tagId === undefined
        ? await createTag(toTagInput(values))
        : await updateTag(tagId, toTagInput(values))
    if (result.success) {
      closeEditor()
    } else {
      setServerError(
        mapApiErrorToForm(
          result.error,
          tagFieldMap,
          tagCodeFieldMap,
          isEditing ? 'Não foi possível salvar a etiqueta.' : 'Não foi possível criar a etiqueta.',
        ),
      )
    }
    setIsSubmitting(false)
  }

  let content: TagEditorContent
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
    const tag = tags.find(item => item.id === tagId)
    content =
      tag === undefined
        ? { status: 'notFound' }
        : {
            status: 'ready',
            initialValues: {
              name: tag.name,
              color: tag.color,
              description: tag.description ?? '',
            },
          }
  }

  return {
    title: isEditing ? 'Editar etiqueta' : 'Nova etiqueta',
    submitLabel: isEditing ? 'Salvar alterações' : 'Criar etiqueta',
    formKey: tagId ?? 'new',
    content,
    isSubmitting,
    serverError,
    onCancel: closeEditor,
    onSubmit,
  }
}
