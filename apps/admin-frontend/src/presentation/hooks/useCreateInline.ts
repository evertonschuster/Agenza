import { useCallback, useEffect, useRef, useState } from 'react'
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
  // Guards two distinct cancellation paths: (1) the component calling this
  // hook unmounts entirely, and (2) - the one that actually happens for
  // ServiceForm's inline category/tag creation - this hook's owner stays
  // mounted for the form's whole lifetime, but the user clicks the inline
  // form's own "Cancelar" button (not disabled during a pending request)
  // while createFn's promise is still in flight. reset() bumps the
  // generation so a create() that was already running when cancel happened
  // can detect it's stale and skip onCreated/serverError/isCreating - none
  // of that should apply to (or resurrect) a request the user already
  // walked away from.
  const isMountedRef = useRef(true)
  const generationRef = useRef(0)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const create = useCallback(
    async (input: TInput, onCreated: (item: TItem) => void): Promise<void> => {
      const generation = generationRef.current
      const isStillWanted = (): boolean =>
        isMountedRef.current && generation === generationRef.current

      setIsCreating(true)
      setServerError(null)
      try {
        const item = await createFn(input)
        if (isStillWanted()) {
          onCreated(item)
        }
      } catch (caughtError) {
        if (isStillWanted()) {
          setServerError(mapApiErrorToForm(caughtError, fieldMap, codeFieldMap, fallbackMessage))
        }
      } finally {
        if (isStillWanted()) {
          setIsCreating(false)
        }
      }
    },
    [createFn, fieldMap, codeFieldMap, fallbackMessage],
  )

  const reset = useCallback((): void => {
    generationRef.current += 1
    setServerError(null)
    setIsCreating(false)
  }, [])

  return { isCreating, serverError, create, reset }
}
