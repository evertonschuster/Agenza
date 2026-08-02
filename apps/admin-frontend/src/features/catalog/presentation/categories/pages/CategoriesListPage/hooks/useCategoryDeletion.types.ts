import type { Category } from '@/features/catalog/domain/entities/Category'
import type { AppError } from '@/shared/application/AppError'
import type { Result } from '@/shared/application/Result'

export interface UseCategoryDeletionParams {
  onDelete: (id: string) => Promise<Result<void, AppError>>
}

export interface UseCategoryDeletionResult {
  target: Category | null
  error: string | null
  isDeleting: boolean
  onRequestDelete: (category: Category) => void
  onCancel: () => void
  onConfirm: () => Promise<void>
}
