import { useState, type SubmitEvent, type JSX } from 'react'
import { TextField } from '../../components/TextField'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { StatusMessage } from '../../components/StatusMessage'

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

export function CategoryForm({
  initialValues,
  submitLabel,
  isSubmitting,
  error,
  onCancel,
  onSubmit,
}: CategoryFormProps): JSX.Element {
  const [name, setName] = useState(initialValues.name)

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault()
    void onSubmit({ name })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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

      {error !== null && <StatusMessage tone="error">{error}</StatusMessage>}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isSubmitting || name.trim().length === 0}>
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
