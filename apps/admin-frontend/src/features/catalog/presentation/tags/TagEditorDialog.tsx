import type { JSX } from 'react'
import type { Tag } from '@/features/catalog/domain/entities/Tag'
import {
  TagForm,
  type TagFormValues,
  type TagFormField,
} from '@/features/catalog/presentation/forms/TagForm'
import type { ServerFormError } from '@/shared/presentation/forms/serverFormError'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type TagEditorContent =
  | { kind: 'create'; title: string; submitLabel: string; initialValues: TagFormValues }
  | { kind: 'edit'; item: Tag; title: string; submitLabel: string; initialValues: TagFormValues }

export interface TagEditorDialogProps {
  isOpen: boolean
  content: TagEditorContent | null
  isSubmitting: boolean
  serverError: ServerFormError<TagFormField> | null
  onCancel: () => void
  onSubmit: (values: TagFormValues) => Promise<void>
}

export function TagEditorDialog({
  isOpen,
  content,
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
          <DialogTitle>{content?.title ?? ''}</DialogTitle>
        </DialogHeader>
        {content !== null && (
          <TagForm
            key={content.kind === 'create' ? 'new' : content.item.id}
            initialValues={content.initialValues}
            submitLabel={content.submitLabel}
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
