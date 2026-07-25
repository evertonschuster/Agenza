import type { JSX } from 'react'
import type { Service } from '@/features/catalog/domain/entities/Service'
import { DeleteConfirmationDialog } from '@/shared/presentation/components/DeleteConfirmationDialog'

export interface ServiceDeleteDialogProps {
  target: Service | null
  error: string | null
  isDeleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function ServiceDeleteDialog({
  target,
  error,
  isDeleting,
  onCancel,
  onConfirm,
}: ServiceDeleteDialogProps): JSX.Element {
  return (
    <DeleteConfirmationDialog
      isOpen={target !== null}
      title="Excluir serviço"
      description={
        <>
          Tem certeza que deseja excluir o serviço "{target?.name}"? Essa ação não pode ser
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
