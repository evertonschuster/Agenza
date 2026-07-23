import { useState } from 'react'

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

  function onRequestDelete(item: T): void {
    setTarget(item)
    setError(null)
  }

  function onCancel(): void {
    setTarget(null)
    setError(null)
  }

  async function onConfirm(): Promise<void> {
    if (target === null) {
      return
    }
    setIsDeleting(true)
    setError(null)
    try {
      await onDelete(target)
      setTarget(null)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : fallbackMessage)
    } finally {
      setIsDeleting(false)
    }
  }

  return { target, error, isDeleting, onRequestDelete, onCancel, onConfirm }
}
