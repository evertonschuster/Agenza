import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppError } from '@/shared/application/AppError'
import type { Result } from '@/shared/application/Result'
import { toUiError } from '@/shared/application/UiError'

interface UseDeleteConfirmationParams<T> {
  onDelete: (item: T) => Promise<Result<void, AppError>>
}

export interface UseDeleteConfirmationResult<T> {
  target: T | null
  error: string | null
  isDeleting: boolean
  onRequestDelete: (item: T) => void
  onCancel: () => void
  onConfirm: () => Promise<void>
}

/** Shared target/progress/error state behind every delete-with-confirm flow (Categories/Services). */
export function useDeleteConfirmation<T>({
  onDelete,
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
    const result = await onDelete(target)
    if (result.success) {
      if (isStillWanted()) {
        setTarget(null)
      }
    } else if (isStillWanted()) {
      setError(toUiError(result.error).message)
    }
    if (isStillWanted()) {
      setIsDeleting(false)
    }
  }, [target, isDeleting, onDelete])

  return { target, error, isDeleting, onRequestDelete, onCancel, onConfirm }
}
