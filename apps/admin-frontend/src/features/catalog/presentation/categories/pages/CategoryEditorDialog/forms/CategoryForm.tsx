import { useEffect, type JSX } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { TextField } from '@/shared/presentation/components/TextField'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { StatusMessage } from '@/shared/presentation/components/StatusMessage'
import {
  categoryFormSchema,
  type CategoryFormValues,
  type CategoryFormProps,
} from '@/features/catalog/presentation/categories/pages/CategoryEditorDialog/forms/CategoryForm.types'

export function CategoryForm({
  initialValues,
  submitLabel,
  isSubmitting,
  serverError,
  onCancel,
  onSubmit,
}: CategoryFormProps): JSX.Element {
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: initialValues,
    mode: 'onTouched',
    reValidateMode: 'onChange',
  })

  useEffect(() => {
    if (serverError === null) {
      return
    }
    for (const { field, message } of serverError.fieldErrors) {
      setError(field, { type: 'server', message })
    }
    if (serverError.firstField !== null) {
      setFocus(serverError.firstField)
    }
  }, [serverError, setError, setFocus])

  return (
    <form onSubmit={e => void handleSubmit(onSubmit)(e)} noValidate className="space-y-4">
      {/* No native `required`/`min`/`max` here - the browser's own constraint
          validation would intercept the submit event before react-hook-form
          ever sees it (and show an unstyled native tooltip instead of this
          form's own accessible, zod-driven error). zod already enforces
          required-ness with a proper message. */}
      <TextField
        id="category-name"
        label="Nome"
        type="text"
        maxLength={60}
        error={errors.name?.message}
        {...register('name')}
      />

      {serverError?.globalMessage != null && (
        <StatusMessage tone="error">{serverError.globalMessage}</StatusMessage>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isSubmitting || errors.name !== undefined}>
          {isSubmitting ? (
            <>
              <Spinner />
              Salvando…
            </>
          ) : (
            submitLabel
          )}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
