import type { JSX } from 'react'
import type { Tag } from '@/features/catalog/domain/entities/Tag'
import {
  TagForm,
  type TagFormValues,
  type TagFormField,
} from '@/features/catalog/presentation/forms/TagForm'
import type { ServerFormError } from '@/shared/presentation/forms/serverFormError'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export interface TagEditorDialogProps {
  isOpen: boolean
  displayTarget: 'new' | Tag | null
  title: string
  submitLabel: string
  initialValues: TagFormValues
  isSubmitting: boolean
  serverError: ServerFormError<TagFormField> | null
  onCancel: () => void
  onSubmit: (values: TagFormValues) => Promise<void>
}

export function TagEditorDialog({
  isOpen,
  displayTarget,
  title,
  submitLabel,
  initialValues,
  isSubmitting,
  serverError,
  onCancel,
  onSubmit,
}: TagEditorDialogProps): JSX.Element {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={open => {
        if (!open) onCancel()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {displayTarget !== null && (
          <TagForm
            key={displayTarget === 'new' ? 'new' : displayTarget.id}
            initialValues={initialValues}
            submitLabel={submitLabel}
            isSubmitting={isSubmitting}
            serverError={serverError}
            onCancel={onCancel}
            onSubmit={onSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
