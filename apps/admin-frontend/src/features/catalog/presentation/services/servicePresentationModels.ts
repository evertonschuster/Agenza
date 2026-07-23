import type { RefObject } from 'react'
import type { Category } from '@/features/catalog/domain/entities/Category'
import type { Tag } from '@/features/catalog/domain/entities/Tag'
import type { Service } from '@/features/catalog/domain/entities/Service'
import type { CreateCategoryInput } from '@/features/catalog/application/repositories/CategoryRepository'
import type { CreateTagInput } from '@/features/catalog/application/repositories/TagRepository'
import type { CreatableSelectStatus } from '@/shared/presentation/components/CreatableSingleSelect'
import type { ServerFormError } from '@/shared/presentation/forms/serverFormError'
import type {
  ServiceFormField,
  ServiceFormValues,
} from '@/features/catalog/presentation/services/ServiceForm.schema'

// Neutral module: useServiceEditor and ServiceDialog/ServiceForm both import
// from here, never from each other, so neither side owns the shared shape.

export type ServiceFormTarget = 'new' | Service

export interface ServiceCategoryOptions {
  items: Category[]
  status: CreatableSelectStatus
  error: string | null
  onRetry: () => void
  onCreate: (input: CreateCategoryInput) => Promise<Category>
}

export interface ServiceTagOptions {
  items: Tag[]
  status: CreatableSelectStatus
  error: string | null
  onRetry: () => void
  onCreate: (input: CreateTagInput) => Promise<Tag>
}

export interface ServiceEditorViewModel {
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
}

export interface DiscardConfirmationViewModel {
  isOpen: boolean
  onCancel: () => void
  onConfirm: () => void
}
