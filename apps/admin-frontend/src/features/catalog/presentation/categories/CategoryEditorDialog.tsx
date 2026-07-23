import type { JSX } from 'react'
import type { Category } from '@/features/catalog/domain/entities/Category'
import {
  CategoryForm,
  type CategoryFormValues,
  type CategoryFormField,
} from '@/features/catalog/presentation/forms/CategoryForm'
import type { ServerFormError } from '@/shared/presentation/forms/serverFormError'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export interface CategoryEditorDialogProps {
  isOpen: boolean
  displayTarget: 'new' | Category | null
  title: string
  submitLabel: string
  initialValues: CategoryFormValues
  isSubmitting: boolean
  serverError: ServerFormError<CategoryFormField> | null
  onCancel: () => void
  onSubmit: (values: CategoryFormValues) => Promise<void>
}

export function CategoryEditorDialog({
  isOpen,
  displayTarget,
  title,
  submitLabel,
  initialValues,
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
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {displayTarget !== null && (
          <CategoryForm
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
