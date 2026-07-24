import type { JSX } from 'react'
import { useFormContext } from 'react-hook-form'
import { TextField } from '@/shared/presentation/components/TextField'
import type {
  ServiceFormInput,
  ServiceFormValues,
} from '@/features/catalog/presentation/services/ServiceForm.schema'

export function ServiceCommercialFields(): JSX.Element {
  const {
    register,
    formState: { errors },
  } = useFormContext<ServiceFormInput, unknown, ServiceFormValues>()

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <TextField
        id="service-price"
        label="Preço"
        type="number"
        step="0.01"
        error={errors.price?.message}
        {...register('price')}
      />
      <TextField
        id="service-max-discount"
        label="Desconto máximo (%)"
        type="number"
        error={errors.maxDiscountPercentage?.message}
        {...register('maxDiscountPercentage')}
      />
    </div>
  )
}
