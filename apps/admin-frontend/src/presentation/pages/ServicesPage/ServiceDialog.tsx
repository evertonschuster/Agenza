import type { JSX, RefObject } from 'react'
import type { Category } from '../../../domain/entities/Category'
import type { Tag } from '../../../domain/entities/Tag'
import type { CreateCategoryInput } from '../../../application/repositories/CategoryRepository'
import type { CreateTagInput } from '../../../application/repositories/TagRepository'
import type { ServiceFormTarget } from './useServicesController'
import { ServiceForm } from './ServiceForm'
import type { ServiceFormValues, ServiceFormField } from './ServiceForm.schema'
import type { ServerFormError } from '../../forms/serverFormError'
import type { CreatableSelectStatus } from '../../components/CreatableSingleSelect'
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
import { EMPTY_SERVICE_FORM_VALUES, toServiceFormValues } from './serviceFormatters'

export interface ServiceDialogProps {
  isOpen: boolean
  displayTarget: ServiceFormTarget | null
  code: number | null
  title: string
  submitLabel: string
  isSubmitting: boolean
  serverError: ServerFormError<ServiceFormField> | null
  formTriggerRef: RefObject<HTMLButtonElement | null>
  onRequestClose: () => void
  onSubmit: (values: ServiceFormValues) => Promise<void>
  onDirtyChange: (isDirty: boolean) => void
  categories: Category[]
  categoriesStatus: CreatableSelectStatus
  categoriesError: string | null
  onRetryCategories: () => void
  onCreateCategory: (input: CreateCategoryInput) => Promise<Category>
  tags: Tag[]
  tagsStatus: CreatableSelectStatus
  tagsError: string | null
  onRetryTags: () => void
  onCreateTag: (input: CreateTagInput) => Promise<Tag>
  discardConfirm: {
    isOpen: boolean
    onCancel: () => void
    onConfirm: () => void
  }
}

/**
 * The create/edit dialog and its dirty-tracking discard-confirmation - the
 * two are one interaction (closing a dirty form asks before discarding), so
 * they're one component rather than two wired together by the page.
 */
export function ServiceDialog({
  isOpen,
  displayTarget,
  code,
  title,
  submitLabel,
  isSubmitting,
  serverError,
  formTriggerRef,
  onRequestClose,
  onSubmit,
  onDirtyChange,
  categories,
  categoriesStatus,
  categoriesError,
  onRetryCategories,
  onCreateCategory,
  tags,
  tagsStatus,
  tagsError,
  onRetryTags,
  onCreateTag,
  discardConfirm,
}: ServiceDialogProps): JSX.Element {
  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={open => {
          if (!open) onRequestClose()
        }}
      >
        <DialogContent
          className="sm:max-w-xl"
          onCloseAutoFocus={event => {
            event.preventDefault()
            formTriggerRef.current?.focus()
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          {displayTarget !== null && (
            <ServiceForm
              key={displayTarget === 'new' ? 'new' : displayTarget.id}
              code={code}
              initialValues={
                displayTarget === 'new'
                  ? EMPTY_SERVICE_FORM_VALUES
                  : toServiceFormValues(displayTarget)
              }
              categories={categories}
              categoriesStatus={categoriesStatus}
              categoriesError={categoriesError}
              onRetryCategories={onRetryCategories}
              tags={tags}
              tagsStatus={tagsStatus}
              tagsError={tagsError}
              onRetryTags={onRetryTags}
              submitLabel={submitLabel}
              isSubmitting={isSubmitting}
              serverError={serverError}
              onCancel={onRequestClose}
              onSubmit={onSubmit}
              onCreateCategory={onCreateCategory}
              onCreateTag={onCreateTag}
              onDirtyChange={onDirtyChange}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={discardConfirm.isOpen}
        onOpenChange={open => {
          if (!open) discardConfirm.onCancel()
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
            <AlertDialogAction variant="destructive" onClick={discardConfirm.onConfirm}>
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
