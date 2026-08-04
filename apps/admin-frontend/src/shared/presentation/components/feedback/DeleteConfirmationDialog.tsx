import { type JSX, type ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { StatusMessage } from '@/shared/presentation/components/feedback/StatusMessage'
import type { Result } from '@/shared/application/Result'
import type { AppError } from '@/shared/application/AppError'
import { useDeleteConfirmation } from '../../hooks/useDeleteConfirmation'

export interface DeleteConfirmationDialogProps {
  isOpen: boolean
  entityName: string
  entityType: string
  title?: string
  description?: ReactNode

  onDelete: () => Promise<Result<void, AppError>>
  onClose: () => void
}

export function DeleteConfirmationDialog({
  isOpen,
  entityName,
  entityType,
  title,
  description,
  onDelete,
  onClose,
}: DeleteConfirmationDialogProps): JSX.Element {

  const { isDeleting, error, onCancel, onConfirm } = useDeleteConfirmation({ onDelete, onClose })

  const entityLabel = entityType.split(' ').pop() ?? entityType
  const defaultTitle = `Excluir ${entityLabel}`
  const defaultDescription = (
    <>
      Tem certeza que deseja excluir {entityType} "{entityName}"? Essa ação não pode ser desfeita.
    </>
  )

  console.log('DeleteConfirmationDialog render', { isOpen, entityName, entityType, title, description, isDeleting, error })

  return (
    <AlertDialog
      open={isOpen}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title ?? defaultTitle}</AlertDialogTitle>
          <AlertDialogDescription>{description ?? defaultDescription}</AlertDialogDescription>
        </AlertDialogHeader>

        {/* //TODO: Cria componente de erro generico */}
        {error !== null && <StatusMessage tone="error">{error.message}</StatusMessage>}


        <AlertDialogFooter>

          <AlertDialogCancel
            onClick={onCancel}
            disabled={isDeleting}>
            Cancelar
          </AlertDialogCancel>

          <AlertDialogAction
            variant="destructive"
            disabled={isDeleting}
            onClick={() => { void onConfirm() }}
          >
            {isDeleting ? 'Excluindo…' : 'Excluir'}
          </AlertDialogAction>

        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
