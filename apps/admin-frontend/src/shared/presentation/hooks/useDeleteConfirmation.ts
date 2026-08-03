import { useCallback, useEffect, useRef, useState } from 'react'
import { toUiError } from '@/shared/application/UiError'
import type { UseDeleteConfirmationParams, UseDeleteConfirmationResult } from './useDeleteConfirmation.types'
import type { AppError } from '@/shared/application/AppError'
import type { Result } from '@/shared/application/Result'

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

  const onConfirm = useCallback(async (): Promise<Result<void, AppError>> => {
    if (target === null || isDeleting) {
      return { success: false, error: new Error('No target selected') as AppError }
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
