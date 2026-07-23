import type { JSX } from 'react'
import type { Tag } from '@/features/catalog/domain/entities/Tag'
import { DeleteConfirmationDialog } from '@/shared/presentation/components/DeleteConfirmationDialog'

export interface TagDeleteDialogProps {
  target: Tag | null
  error: string | null
  isDeleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function TagDeleteDialog({
  target,
  error,
  isDeleting,
  onCancel,
  onConfirm,
}: TagDeleteDialogProps): JSX.Element {
  return (
    <DeleteConfirmationDialog
      isOpen={target !== null}
      title="Excluir etiqueta"
      description={
        <>
          Tem certeza de que deseja excluir a etiqueta "{target?.name}"? Essa ação não pode ser
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
