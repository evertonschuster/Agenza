import { useCallback, useEffect, useRef, useState } from 'react'
import {
  mapApiErrorToForm,
  type ServerFormError,
} from '@/shared/presentation/forms/serverFormError'

interface UseCreateInlineResult<TItem, TInput, TField extends string> {
  isCreating: boolean
  serverError: ServerFormError<TField> | null
  create: (input: TInput, onCreated: (item: TItem) => void) => Promise<void>
  reset: () => void
}

// Shared state machine behind every inline "create without leaving this
// form" flow - keeps the outer form untouched and the popover open on error,
// instead of duplicating this per entity.
export function useCreateInline<TItem, TInput, TField extends string>(
  createFn: (input: TInput) => Promise<TItem>,
  fieldMap: Record<string, TField>,
  codeFieldMap: Record<string, TField>,
  fallbackMessage: string,
): UseCreateInlineResult<TItem, TInput, TField> {
  const [isCreating, setIsCreating] = useState(false)
  const [serverError, setServerError] = useState<ServerFormError<TField> | null>(null)
  // Guards unmount AND a "Cancelar" click while createFn is still in flight -
  // reset() bumps the generation so a stale create() skips onCreated/serverError.
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
