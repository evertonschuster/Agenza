import type { RefObject } from 'react'
import type { Category } from '@/features/catalog/domain/entities/Category'
import type { Tag } from '@/features/catalog/domain/entities/Tag'
import type { Service } from '@/features/catalog/domain/entities/Service'
import type { CreateCategoryInput } from '@/features/catalog/application/repositories/CategoryRepository'
import type { CreateTagInput } from '@/features/catalog/application/repositories/TagRepository'
import type { SelectLoadState } from '@/shared/presentation/components/SelectLoadState'
import type { ServerFormError } from '@/shared/presentation/forms/serverFormError'
import type {
  ServiceFormField,
  ServiceFormInput,
  ServiceFormValues,
} from '@/features/catalog/presentation/services/ServiceForm.schema'

// Neutral module: useServiceEditor and ServiceDialog/ServiceForm both import
// from here, never from each other, so neither side owns the shared shape.

/** A discriminant, not a sentinel value - unlike `'new' | Service`, this can never collide with a legitimate Service. */
export type ServiceFormTarget = { kind: 'create' } | { kind: 'edit'; item: Service }

export type ServiceEditorContent =
  | {
      kind: 'create'
      title: string
      submitLabel: string
      code: null
      initialValues: ServiceFormInput
    }
  | {
      kind: 'edit'
      item: Service
      title: string
      submitLabel: string
      code: number
      initialValues: ServiceFormInput
    }

export interface ServiceCategoryOptions {
  items: readonly Category[]
  loadState: SelectLoadState
  onCreate: (input: CreateCategoryInput) => Promise<Category>
}

export interface ServiceTagOptions {
  items: readonly Tag[]
  loadState: SelectLoadState
  onCreate: (input: CreateTagInput) => Promise<Tag>
}

export interface ServiceEditorViewModel {
  isOpen: boolean
  content: ServiceEditorContent | null
  isSubmitting: boolean
  serverError: ServerFormError<ServiceFormField> | null
  formTriggerRef: RefObject<HTMLButtonElement | null>
  onRequestClose: () => void
  onSubmit: (values: ServiceFormValues) => Promise<void>
  onDirtyChange: (isDirty: boolean) => void
}

export interface DiscardConfirmationViewModel {
  isOpen: boolean
  onCancel: () => void
  onConfirm: () => void
}
