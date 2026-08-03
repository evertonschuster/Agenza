import { useState, type JSX, type ReactNode } from 'react'
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

export interface DeleteConfirmationDialogProps {
  isOpen: boolean
  entityName: string
  entityType: string
  title?: string
  description?: ReactNode
  onCancel: () => void
  onConfirm: () => Promise<Result<void, AppError>>
}

export function DeleteConfirmationDialog({
  isOpen,
  entityName,
  entityType,
  title,
  description,
  onCancel,
  onConfirm,
}: DeleteConfirmationDialogProps): JSX.Element {

  const [isProcessing, setIsProcessing] = useState(false)
  const [error] = useState<string | null>(null)

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
      onOpenChange={(open: boolean) => {
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
          <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isProcessing}
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              event.preventDefault()
              void (async () => {
                setIsProcessing(true)
                try {
                 const result = await onConfirm()
                 console.log('Deletion result:', result)
                } catch (error) {
                  console.error('Error during deletion:', error)
                } finally {
                  setIsProcessing(false)
                }
              })()
            }}
          >
            {isProcessing ? 'Excluindo…' : 'Excluir'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
