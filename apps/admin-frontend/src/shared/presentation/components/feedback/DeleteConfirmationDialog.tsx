import type { JSX, ReactNode } from 'react'
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

export interface DeleteConfirmationDialogProps {
  isOpen: boolean
  entityName: string
  entityType: string
  title?: string
  description?: ReactNode
  error: string | null
  isDeleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

/** Shared delete AlertDialog behind Categories/Services - generates default title/description from entity info. */
export function DeleteConfirmationDialog({
  isOpen,
  entityName,
  entityType,
  title,
  description,
  error,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteConfirmationDialogProps): JSX.Element {
  const entityLabel = entityType.split(' ').pop() ?? entityType
  const defaultTitle = `Excluir ${entityLabel}`
  const defaultDescription = (
    <>
      Tem certeza que deseja excluir {entityType} "{entityName}"? Essa ação não pode ser desfeita.
    </>
  )

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={open => {
        if (!open) onCancel()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title ?? defaultTitle}</AlertDialogTitle>
          <AlertDialogDescription>{description ?? defaultDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        {error !== null && <StatusMessage tone="error">{error}</StatusMessage>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isDeleting}
            onClick={event => {
              event.preventDefault()
              onConfirm()
            }}
          >
            {isDeleting ? 'Excluindo…' : 'Excluir'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
