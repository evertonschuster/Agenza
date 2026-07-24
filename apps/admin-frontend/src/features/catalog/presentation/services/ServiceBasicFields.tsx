import type { JSX } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { TextField } from '@/shared/presentation/components/TextField'
import { TextAreaField } from '@/shared/presentation/components/TextAreaField'
import {
  SERVICE_NAME_MAX_LENGTH,
  SERVICE_DESCRIPTION_MAX_LENGTH,
  type ServiceFormInput,
  type ServiceFormValues,
} from '@/features/catalog/presentation/services/ServiceForm.schema'

export function ServiceBasicFields(): JSX.Element {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ServiceFormInput, unknown, ServiceFormValues>()
  const descriptionValue = useWatch({ control, name: 'description' })

  return (
    <>
      <TextField
        id="service-name"
        label="Nome"
        type="text"
        maxLength={SERVICE_NAME_MAX_LENGTH}
        error={errors.name?.message}
        {...register('name')}
      />

      <TextAreaField
        id="service-description"
        label="Descrição"
        hint="(opcional)"
        rows={2}
        maxLength={SERVICE_DESCRIPTION_MAX_LENGTH}
        showCount
        currentLength={descriptionValue.length}
        error={errors.description?.message}
        {...register('description')}
      />
    </>
  )
}
