import { useCallback, useState } from 'react'

interface UseCreateInlineResult<TItem, TInput> {
  isCreating: boolean
  error: string | null
  create: (input: TInput, onCreated: (item: TItem) => void) => Promise<void>
  reset: () => void
}

/**
 * Shared isCreating/error/create state machine behind every inline
 * "create a related record without leaving this form" flow
 * (CreatableSingleSelect/CreatableMultiSelect's renderCreateForm) - keeps
 * the values already typed in the outer form untouched and lets the popover
 * stay open to show an error, instead of duplicating this per entity.
 */
export function useCreateInline<TItem, TInput>(
  createFn: (input: TInput) => Promise<TItem>,
): UseCreateInlineResult<TItem, TInput> {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(
    async (input: TInput, onCreated: (item: TItem) => void): Promise<void> => {
      setIsCreating(true)
      setError(null)
      try {
        const item = await createFn(input)
        onCreated(item)
      } catch (caughtError) {
        setError(
          caughtError instanceof Error ? caughtError.message : 'Não foi possível criar o registro.',
        )
      } finally {
        setIsCreating(false)
      }
    },
    [createFn],
  )

  const reset = useCallback((): void => {
    setError(null)
  }, [])

  return { isCreating, error, create, reset }
}
