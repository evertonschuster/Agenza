import { useCallback, useState } from 'react'
import type { UseDeleteConfirmationParams, UseDeleteConfirmationResult } from './useDeleteConfirmation.types'
import type { AppError } from '@/shared/application/AppError'
import type { Result } from '@/shared/application/Result'

export function useDeleteConfirmation({
  onDelete,
  onClose,
}: UseDeleteConfirmationParams): UseDeleteConfirmationResult {
  const [error, setError] = useState<AppError | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  function onCancel(): void {
    setError(null)
    setIsDeleting(false)
    onClose()
  }

  const onConfirm = useCallback(async (): Promise<Result<void, AppError>> => {
    setIsDeleting(true)
    setError(null)

    try {
      const result = await onDelete()
      console.log('Deletion result:', result)
      if (!result.success) {
        setError(result.error)
        return result;
      }

      onClose()
      return result
    } finally {
      setIsDeleting(false)
    }
  }, [onDelete, onClose])

  return { error, isDeleting, onCancel, onConfirm }
}
