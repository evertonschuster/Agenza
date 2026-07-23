import type { JSX } from 'react'
import type { Category } from '@/features/catalog/domain/entities/Category'
import { DeleteConfirmationDialog } from '@/shared/presentation/components/DeleteConfirmationDialog'

export interface CategoryDeleteDialogProps {
  target: Category | null
  error: string | null
  isDeleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function CategoryDeleteDialog({
  target,
  error,
  isDeleting,
  onCancel,
  onConfirm,
}: CategoryDeleteDialogProps): JSX.Element {
  return (
    <DeleteConfirmationDialog
      isOpen={target !== null}
      title="Excluir categoria"
      description={
        <>
          Tem certeza que deseja excluir a categoria "{target?.name}"? Essa ação não pode ser
          desfeita.
        </>
      }
      error={error}
      isDeleting={isDeleting}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  )
}
