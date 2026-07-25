import { useCallback, useEffect, useRef, useState } from 'react'

interface UseDeleteConfirmationParams<T> {
  onDelete: (item: T) => Promise<void>
  fallbackMessage: string
}

export interface UseDeleteConfirmationResult<T> {
  target: T | null
  error: string | null
  isDeleting: boolean
  onRequestDelete: (item: T) => void
  onCancel: () => void
  onConfirm: () => Promise<void>
}

/** Shared target/progress/error state behind every delete-with-confirm flow (Tags/Categories/Services). */
export function useDeleteConfirmation<T>({
  onDelete,
  fallbackMessage,
}: UseDeleteConfirmationParams<T>): UseDeleteConfirmationResult<T> {
  const [target, setTarget] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const isMountedRef = useRef(true)
  const generationRef = useRef(0)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  function onRequestDelete(item: T): void {
    generationRef.current += 1
    setTarget(item)
    setError(null)
  }

  function onCancel(): void {
    generationRef.current += 1
    setTarget(null)
    setError(null)
    setIsDeleting(false)
  }

  const onConfirm = useCallback(async (): Promise<void> => {
    if (target === null || isDeleting) {
      return
    }
    const generation = generationRef.current
    const isStillWanted = (): boolean =>
      isMountedRef.current && generation === generationRef.current

    setIsDeleting(true)
    setError(null)
    try {
      await onDelete(target)
      if (isStillWanted()) {
        setTarget(null)
      }
    } catch (caughtError) {
      if (isStillWanted()) {
        setError(caughtError instanceof Error ? caughtError.message : fallbackMessage)
      }
    } finally {
      if (isStillWanted()) {
        setIsDeleting(false)
      }
    }
  }, [target, isDeleting, onDelete, fallbackMessage])

  return { target, error, isDeleting, onRequestDelete, onCancel, onConfirm }
}
