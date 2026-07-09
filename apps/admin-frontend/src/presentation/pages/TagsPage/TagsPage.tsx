import { useState, type JSX } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useTags } from '../../hooks/useTags'
import { TAG_COLOR_PALETTE, type TagColor } from '../../../domain/entities/Tag'
import { TagForm, type TagFormValues } from './TagForm'

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

function messageFrom(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export function TagsPage(): JSX.Element {
  const { tenantContext } = useAuth()
  const { tags, status, error, createTag, updateTag, deleteTag } = useTags(tenantContext)

  const [isCreating, setIsCreating] = useState(false)
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function openCreateForm(): void {
    setIsCreating(true)
    setFormError(null)
  }

  function closeForms(): void {
    setIsCreating(false)
    setEditingTagId(null)
    setFormError(null)
  }

  async function handleCreate(values: TagFormValues): Promise<void> {
    setIsSubmitting(true)
    setFormError(null)
    try {
      await createTag(toTagInput(values))
      closeForms()
    } catch (caughtError) {
      setFormError(messageFrom(caughtError, 'Could not create the tag.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleUpdate(id: string, values: TagFormValues): Promise<void> {
    setIsSubmitting(true)
    setFormError(null)
    try {
      await updateTag(id, toTagInput(values))
      closeForms()
    } catch (caughtError) {
      setFormError(messageFrom(caughtError, 'Could not update the tag.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(id: string, name: string): Promise<void> {
    if (!window.confirm(`Delete the "${name}" tag?`)) {
      return
    }
    await deleteTag(id)
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Tags</h1>
        {!isCreating && (
          <button
            type="button"
            onClick={openCreateForm}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            New tag
          </button>
        )}
      </div>

      {isCreating && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6">
          <TagForm
            initialValues={EMPTY_FORM_VALUES}
            submitLabel="Create tag"
            isSubmitting={isSubmitting}
            error={formError}
            onCancel={closeForms}
            onSubmit={handleCreate}
          />
        </div>
      )}

      <div className="mt-6">
        {status === 'loading' && <p className="text-sm text-slate-400">Loading tags…</p>}

        {status === 'error' && (
          <p className="text-sm text-red-600">
            Could not load tags{error instanceof Error ? `: ${error.message}` : '.'}
          </p>
        )}

        {status === 'success' && tags.length === 0 && (
          <p className="text-sm text-slate-400">No tags yet. Create one to get started.</p>
        )}

        {status === 'success' && tags.length > 0 && (
          <ul className="space-y-2">
            {tags.map(tag => (
              <li key={tag.id}>
                {editingTagId === tag.id ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-6">
                    <TagForm
                      initialValues={{
                        name: tag.name,
                        color: tag.color,
                        description: tag.description ?? '',
                      }}
                      submitLabel="Save changes"
                      isSubmitting={isSubmitting}
                      error={formError}
                      onCancel={closeForms}
                      onSubmit={values => handleUpdate(tag.id, values)}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: tag.color }}
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{tag.name}</p>
                        {tag.description !== undefined && (
                          <p className="text-xs text-slate-400">{tag.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTagId(tag.id)
                          setFormError(null)
                        }}
                        className="text-sm font-medium text-teal-700 hover:text-teal-800"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(tag.id, tag.name)}
                        className="text-sm font-medium text-slate-500 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
