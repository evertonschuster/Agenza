import { useState, type SubmitEvent, type JSX } from 'react'
import { TextField } from '../../components/TextField'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { StatusMessage } from '../../components/StatusMessage'
import { useFormValidation } from '../../hooks/useFormValidation'
import { Category } from '../../../domain/entities/Category'
import { InvalidCategoryError } from '../../../domain/errors/InvalidCategoryError'

export interface CategoryFormValues {
  name: string
}

interface CategoryFormProps {
  initialValues: CategoryFormValues
  submitLabel: string
  isSubmitting: boolean
  error: string | null
  onCancel: () => void
  onSubmit: (values: CategoryFormValues) => Promise<void>
}

function validate(values: CategoryFormValues): string | null {
  try {
    Category.create({ id: 'validation', name: values.name })
    return null
  } catch (caughtError) {
    return caughtError instanceof InvalidCategoryError ? caughtError.message : null
  }
}

export function CategoryForm({
  initialValues,
  submitLabel,
  isSubmitting,
  error,
  onCancel,
  onSubmit,
}: CategoryFormProps): JSX.Element {
  const [name, setName] = useState(initialValues.name)
  const {
    markTouched,
    displayedError: displayedValidationErrorFor,
    validateForSubmit,
  } = useFormValidation(validate)

  const values: CategoryFormValues = { name }
  const displayedValidationError = displayedValidationErrorFor(values)

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault()
    if (validateForSubmit(values) !== null) {
      return
    }
    void onSubmit(values)
  }

  const displayedError = displayedValidationError ?? error

  return (
    <form onSubmit={handleSubmit} onBlur={markTouched} className="space-y-4">
      <TextField
        id="category-name"
        label="Nome"
        type="text"
        required
        maxLength={60}
        value={name}
        onChange={event => {
          setName(event.target.value)
        }}
      />

      {displayedError !== null && <StatusMessage tone="error">{displayedError}</StatusMessage>}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isSubmitting || displayedValidationError !== null}>
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
