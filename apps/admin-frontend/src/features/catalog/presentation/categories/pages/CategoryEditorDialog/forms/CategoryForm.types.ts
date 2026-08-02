import { z } from 'zod'
import type { ServerFormError } from '@/shared/presentation/forms/serverFormError'

const NAME_MESSAGE = 'O nome da categoria deve ter entre 1 e 60 caracteres'

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, NAME_MESSAGE).max(60, NAME_MESSAGE),
})

export type CategoryFormValues = z.infer<typeof categoryFormSchema>
export type CategoryFormField = keyof CategoryFormValues

export interface CategoryFormProps {
  initialValues: CategoryFormValues
  submitLabel: string
  isSubmitting: boolean
  serverError: ServerFormError<CategoryFormField> | null
  onCancel: () => void
  onSubmit: (values: CategoryFormValues) => Promise<void>
}
