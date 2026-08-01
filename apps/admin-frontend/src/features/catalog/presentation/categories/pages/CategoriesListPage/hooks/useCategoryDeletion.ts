import type { Category } from '@/features/catalog/domain/entities/Category'
import { useDeleteConfirmation } from '@/shared/presentation/hooks/useDeleteConfirmation'
import type {
  UseCategoryDeletionParams,
  UseCategoryDeletionResult,
} from '@/features/catalog/presentation/categories/pages/CategoriesListPage/hooks/useCategoryDeletion.types'

export function useCategoryDeletion({
  onDelete,
}: UseCategoryDeletionParams): UseCategoryDeletionResult {
  return useDeleteConfirmation<Category>({
    onDelete: category => onDelete(category.id),
  })
}
