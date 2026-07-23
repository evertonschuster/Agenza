import { useEffect, type JSX } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ServerFormError } from '@/shared/presentation/forms/serverFormError'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { StatusMessage } from '@/shared/presentation/components/StatusMessage'
import { ServiceBasicFields } from '@/features/catalog/presentation/services/ServiceBasicFields'
import { ServiceDurationFields } from '@/features/catalog/presentation/services/ServiceDurationFields'
import { ServiceCommercialFields } from '@/features/catalog/presentation/services/ServiceCommercialFields'
import { ServiceCategoryField } from '@/features/catalog/presentation/services/ServiceCategoryField'
import { ServiceTagsField } from '@/features/catalog/presentation/services/ServiceTagsField'
import type {
  ServiceCategoryOptions,
  ServiceTagOptions,
} from '@/features/catalog/presentation/services/servicePresentationModels'
import {
  serviceFormSchema,
  type ServiceFormInput,
  type ServiceFormValues,
  type ServiceFormField,
} from '@/features/catalog/presentation/services/ServiceForm.schema'

interface ServiceFormProps {
  code: number | null
  initialValues: ServiceFormInput
  categoryOptions: ServiceCategoryOptions
  tagOptions: ServiceTagOptions
  submitLabel: string
  isSubmitting: boolean
  serverError: ServerFormError<ServiceFormField> | null
  onCancel: () => void
  onSubmit: (values: ServiceFormValues) => Promise<void>
  onDirtyChange: (isDirty: boolean) => void
}

export function ServiceForm({
  code,
  initialValues,
  categoryOptions,
  tagOptions,
  submitLabel,
  isSubmitting,
  serverError,
  onCancel,
  onSubmit,
  onDirtyChange,
}: ServiceFormProps): JSX.Element {
  const methods = useForm<ServiceFormInput, unknown, ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: initialValues,
    mode: 'onTouched',
    reValidateMode: 'onChange',
  })
  const {
    handleSubmit,
    setError,
    setFocus,
    formState: { errors, isDirty },
  } = methods
  const hasErrors = Object.keys(errors).length > 0

  useEffect(() => {
    onDirtyChange(isDirty)
  }, [isDirty, onDirtyChange])

  useEffect(() => {
    if (serverError === null) {
      return
    }
    for (const [field, message] of Object.entries(serverError.fieldErrors)) {
      setError(field as ServiceFormField, { type: 'server', message })
    }
    if (serverError.firstField !== null) {
      setFocus(serverError.firstField)
    }
  }, [serverError, setError, setFocus])

  return (
    <FormProvider {...methods}>
      <form onSubmit={e => void handleSubmit(onSubmit)(e)} noValidate className="space-y-4">
        {code !== null && (
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-foreground">Código</span>
            <p className="text-sm text-muted-foreground">{code}</p>
          </div>
        )}

        <ServiceBasicFields />
        <ServiceDurationFields />
        <ServiceCommercialFields />
        <ServiceCategoryField options={categoryOptions} />
        <ServiceTagsField options={tagOptions} />

        {serverError?.globalMessage != null && (
          <StatusMessage tone="error">{serverError.globalMessage}</StatusMessage>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={isSubmitting || hasErrors}>
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
    </FormProvider>
  )
}
