import type { AppError } from '@/shared/application/AppError'
import type { Result } from '@/shared/application/Result'

export interface UseDeleteConfirmationParams<T> {
  onDelete: (item: T) => Promise<Result<void, AppError>>
}

export interface UseDeleteConfirmationResult<T> {
  target: T | null
  error: string | null
  isDeleting: boolean
  onRequestDelete: (item: T) => void
  onCancel: () => void
  onConfirm: () => Promise<Result<void, AppError>>
}
