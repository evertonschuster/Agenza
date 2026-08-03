import type { Category } from '@/features/catalog/domain/entities/Category'
import { useDeleteConfirmation } from '@/shared/presentation/hooks/useDeleteConfirmation'
import type {
  UseCategoryDeletionResult,
} from '@/features/catalog/presentation/categories/pages/CategoriesListPage/hooks/useCategoryDeletion.types'
import { useCallback } from 'react'
import type { Result } from '@/shared/application/Result'
import { useAppContainer } from '@/app/providers/useAppContainer'
import type { AppError } from '@/shared/application/AppError'

export function useCategoryDeletion(): UseCategoryDeletionResult {
  const { catalog } = useAppContainer()

  const deleteCategory = useCallback(
    async (id: string): Promise<Result<void, AppError>> => {
      const deleteResult = await catalog.deleteCategory.execute(id)
      //todo: handle error and show toast notification
      return deleteResult
    },
    [catalog],
  )

  const deleteConfirmation = useDeleteConfirmation<Category>({
    onDelete: category => deleteCategory(category.id),
  })

  return {
    isOpen: deleteConfirmation.target !== null,
    entityName: deleteConfirmation.target?.name ?? '',
    entityType: 'Categoria',
    error: deleteConfirmation.error,
    isDeleting: deleteConfirmation.isDeleting,
    onRequestDelete: deleteConfirmation.onRequestDelete,
    onCancel: deleteConfirmation.onCancel,
    onConfirm: deleteConfirmation.onConfirm,
  }
}
