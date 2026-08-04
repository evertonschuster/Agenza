import type { AppError } from '@/shared/application/AppError'
import type { Result } from '@/shared/application/Result'

export interface UseDeleteConfirmationParams {
    onDelete: () => Promise<Result<void, AppError>>
    onClose: () => void
}

export interface UseDeleteConfirmationResult {
    error: AppError | null
    isDeleting: boolean
    onCancel: () => void
    onConfirm: () => Promise<Result<void, AppError>>
}
