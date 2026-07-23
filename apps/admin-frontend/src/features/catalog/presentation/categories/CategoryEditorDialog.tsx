import type { JSX } from 'react'
import type { Category } from '@/features/catalog/domain/entities/Category'
import {
  CategoryForm,
  type CategoryFormValues,
  type CategoryFormField,
} from '@/features/catalog/presentation/forms/CategoryForm'
import type { ServerFormError } from '@/shared/presentation/forms/serverFormError'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type CategoryEditorContent =
  | { kind: 'create'; title: string; submitLabel: string; initialValues: CategoryFormValues }
  | {
      kind: 'edit'
      item: Category
      title: string
      submitLabel: string
      initialValues: CategoryFormValues
    }

export interface CategoryEditorDialogProps {
  isOpen: boolean
  content: CategoryEditorContent | null
  isSubmitting: boolean
  serverError: ServerFormError<CategoryFormField> | null
  onCancel: () => void
  onSubmit: (values: CategoryFormValues) => Promise<void>
}

export function CategoryEditorDialog({
  isOpen,
  content,
  isSubmitting,
  serverError,
  onCancel,
  onSubmit,
}: CategoryEditorDialogProps): JSX.Element {
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
          <CategoryForm
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
