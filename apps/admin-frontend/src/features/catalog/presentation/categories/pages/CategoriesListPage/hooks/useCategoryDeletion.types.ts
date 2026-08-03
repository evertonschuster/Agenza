import type { Category } from '@/features/catalog/domain/entities/Category'


export interface UseCategoryDeletionResult {
  isOpen: boolean
  entityName: string
  entityType: string
  error: string | null
  isDeleting: boolean
  onRequestDelete: (category: Category) => void
  onCancel: () => void
  onConfirm: () => Promise<void>
}
