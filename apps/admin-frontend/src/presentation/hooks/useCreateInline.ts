import { useCallback, useState } from 'react'
import { mapApiErrorToForm, type ServerFormError } from '../forms/serverFormError'

interface UseCreateInlineResult<TItem, TInput, TField extends string> {
  isCreating: boolean
  serverError: ServerFormError<TField> | null
  create: (input: TInput, onCreated: (item: TItem) => void) => Promise<void>
  reset: () => void
}

/**
 * Shared isCreating/serverError/create state machine behind every inline
 * "create a related record without leaving this form" flow
 * (CreatableSingleSelect/CreatableMultiSelect's renderCreateForm) - keeps
 * the values already typed in the outer form untouched and lets the popover
 * stay open to show an error, instead of duplicating this per entity.
 * `fieldMap`/`codeFieldMap` mirror the ones each entity's own page uses, so
 * a duplicate-name conflict from an inline create highlights the same field
 * it would from the full page form.
 */
export function useCreateInline<TItem, TInput, TField extends string>(
  createFn: (input: TInput) => Promise<TItem>,
  fieldMap: Record<string, TField>,
  codeFieldMap: Record<string, TField>,
  fallbackMessage: string,
): UseCreateInlineResult<TItem, TInput, TField> {
  const [isCreating, setIsCreating] = useState(false)
  const [serverError, setServerError] = useState<ServerFormError<TField> | null>(null)

  const create = useCallback(
    async (input: TInput, onCreated: (item: TItem) => void): Promise<void> => {
      setIsCreating(true)
      setServerError(null)
      try {
        const item = await createFn(input)
        onCreated(item)
      } catch (caughtError) {
        setServerError(mapApiErrorToForm(caughtError, fieldMap, codeFieldMap, fallbackMessage))
      } finally {
        setIsCreating(false)
      }
    },
    [createFn, fieldMap, codeFieldMap, fallbackMessage],
  )

  const reset = useCallback((): void => {
    setServerError(null)
  }, [])

  return { isCreating, serverError, create, reset }
}
