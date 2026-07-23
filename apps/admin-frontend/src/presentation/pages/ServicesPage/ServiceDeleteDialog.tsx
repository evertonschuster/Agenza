import type { JSX } from 'react'
import type { Service } from '../../../domain/entities/Service'
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
import { StatusMessage } from '../../components/StatusMessage'

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
    <AlertDialog
      open={target !== null}
      onOpenChange={open => {
        if (!open) onCancel()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir serviço</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o serviço "{target?.name}"? Essa ação não pode ser
            desfeita.
          </AlertDialogDescription>
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
