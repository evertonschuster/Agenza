import type { JSX } from 'react'
import { useFormContext } from 'react-hook-form'
import { TextField } from '@/shared/presentation/components/TextField'
import type {
  ServiceFormInput,
  ServiceFormValues,
} from '@/features/catalog/presentation/services/ServiceForm.schema'

export function ServiceDurationFields(): JSX.Element {
  const {
    register,
    formState: { errors },
  } = useFormContext<ServiceFormInput, unknown, ServiceFormValues>()

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <TextField
        id="service-min-duration"
        label="Duração mínima (min)"
        type="number"
        error={errors.minDurationMinutes?.message}
        {...register('minDurationMinutes')}
      />
      <TextField
        id="service-duration"
        label="Duração (min)"
        type="number"
        error={errors.durationMinutes?.message}
        {...register('durationMinutes')}
      />
      <TextField
        id="service-max-duration"
        label="Duração máxima (min)"
        type="number"
        error={errors.maxDurationMinutes?.message}
        {...register('maxDurationMinutes')}
      />
    </div>
  )
}
