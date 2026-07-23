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
import { StatusMessage } from '@/shared/presentation/components/StatusMessage'

export interface DeleteConfirmationDialogProps {
  isOpen: boolean
  title: string
  description: ReactNode
  error: string | null
  isDeleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

/** Shared delete AlertDialog behind Tags/Categories/Services - callers own the entity-specific title/description. */
export function DeleteConfirmationDialog({
  isOpen,
  title,
  description,
  error,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteConfirmationDialogProps): JSX.Element {
  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={open => {
        if (!open) onCancel()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
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
