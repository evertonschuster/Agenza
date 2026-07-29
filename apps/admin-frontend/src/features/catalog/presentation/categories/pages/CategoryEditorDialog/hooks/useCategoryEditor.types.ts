import type { Category } from '@/features/catalog/domain/entities/Category'
import type {
  CategoryFormField,
  CategoryFormValues,
} from '@/features/catalog/presentation/categories/pages/CategoryEditorDialog/forms/CategoryForm.types'
import type { ServerFormError } from '@/shared/presentation/forms/serverFormError'

export type CategoriesLoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; categories: readonly Category[] }

export type CategoryEditorContent =
  | { status: 'loading' }
  | { status: 'loadError'; message: string; onRetry: () => void }
  | { status: 'notFound' }
  | { status: 'ready'; initialValues: CategoryFormValues }

export interface UseCategoryEditorResult {
  title: string
  submitLabel: string
  formKey: string
  content: CategoryEditorContent
  isSubmitting: boolean
  serverError: ServerFormError<CategoryFormField> | null
  onCancel: () => void
  onSubmit: (values: CategoryFormValues) => Promise<void>
}
