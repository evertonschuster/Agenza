import type { JSX } from 'react'
import { ServiceForm } from '@/features/catalog/presentation/services/ServiceForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import type {
  DiscardConfirmationViewModel,
  ServiceCategoryOptions,
  ServiceEditorViewModel,
  ServiceTagOptions,
} from '@/features/catalog/presentation/services/servicePresentationModels'

export interface ServiceDialogProps {
  editor: ServiceEditorViewModel
  categoryOptions: ServiceCategoryOptions
  tagOptions: ServiceTagOptions
  discardConfirmation: DiscardConfirmationViewModel
}

/**
 * The create/edit dialog and its dirty-tracking discard-confirmation - the
 * two are one interaction (closing a dirty form asks before discarding), so
 * they're one component rather than two wired together by the page.
 */
export function ServiceDialog({
  editor,
  categoryOptions,
  tagOptions,
  discardConfirmation,
}: ServiceDialogProps): JSX.Element {
  return (
    <>
      <Dialog
        open={editor.isOpen}
        onOpenChange={open => {
          if (!open) editor.onRequestClose()
        }}
      >
        <DialogContent
          className="sm:max-w-xl"
          onCloseAutoFocus={event => {
            event.preventDefault()
            editor.formTriggerRef.current?.focus()
          }}
        >
          <DialogHeader>
            <DialogTitle>{editor.content?.title ?? ''}</DialogTitle>
          </DialogHeader>
          {editor.content !== null && (
            <ServiceForm
              key={editor.content.kind === 'create' ? 'new' : editor.content.item.id}
              code={editor.content.code}
              initialValues={editor.content.initialValues}
              categoryOptions={categoryOptions}
              tagOptions={tagOptions}
              submitLabel={editor.content.submitLabel}
              isSubmitting={editor.isSubmitting}
              serverError={editor.serverError}
              onCancel={editor.onRequestClose}
              onSubmit={editor.onSubmit}
              onDirtyChange={editor.onDirtyChange}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={discardConfirmation.isOpen}
        onOpenChange={open => {
          if (!open) discardConfirmation.onCancel()
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              Suas alterações não foram salvas. Deseja descartá-las?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={discardConfirmation.onConfirm}>
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
