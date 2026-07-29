import type { Category } from '@/features/catalog/domain/entities/Category'

export interface UseCategoryDeletionParams {
  onDelete: (id: string) => Promise<void>
}

export interface UseCategoryDeletionResult {
  target: Category | null
  error: string | null
  isDeleting: boolean
  onRequestDelete: (category: Category) => void
  onCancel: () => void
  onConfirm: () => Promise<void>
}
