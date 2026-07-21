import { useState, type SubmitEvent, type JSX } from 'react'
import { TAG_COLOR_PALETTE, Tag, type TagColor } from '../../../domain/entities/Tag'
import { TextField } from '../../components/TextField'
import { TextAreaField } from '../../components/TextAreaField'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { StatusMessage } from '../../components/StatusMessage'
import { useFormValidation } from '../../hooks/useFormValidation'
import { InvalidTagError } from '../../../domain/errors/InvalidTagError'

export interface TagFormValues {
  name: string
  color: TagColor
  description: string
}

interface TagFormProps {
  initialValues: TagFormValues
  submitLabel: string
  isSubmitting: boolean
  error: string | null
  onCancel: () => void
  onSubmit: (values: TagFormValues) => Promise<void>
}

function validate(values: TagFormValues): string | null {
  try {
    Tag.create({
      id: 'validation',
      name: values.name,
      color: values.color,
      description: values.description,
    })
    return null
  } catch (caughtError) {
    return caughtError instanceof InvalidTagError ? caughtError.message : null
  }
}

export function TagForm({
  initialValues,
  submitLabel,
  isSubmitting,
  error,
  onCancel,
  onSubmit,
}: TagFormProps): JSX.Element {
  const [name, setName] = useState(initialValues.name)
  const [color, setColor] = useState<TagColor>(initialValues.color)
  const [description, setDescription] = useState(initialValues.description)
  const {
    markTouched,
    displayedError: displayedValidationErrorFor,
    validateForSubmit,
  } = useFormValidation(validate)

  const values: TagFormValues = { name, color, description }
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
        id="tag-name"
        label="Nome"
        type="text"
        required
        maxLength={40}
        value={name}
        onChange={event => {
          setName(event.target.value)
        }}
      />

      <div>
        <span className="block text-sm font-medium text-foreground">Cor</span>
        <div className="mt-1 flex flex-wrap gap-2">
          {TAG_COLOR_PALETTE.map(paletteColor => (
            <button
              key={paletteColor}
              type="button"
              aria-label={`Cor ${paletteColor}`}
              aria-pressed={color === paletteColor}
              onClick={() => {
                setColor(paletteColor)
              }}
              className={[
                'h-7 w-7 rounded-full border-2',
                color === paletteColor ? 'border-foreground' : 'border-transparent',
              ].join(' ')}
              style={{ backgroundColor: paletteColor }}
            />
          ))}
        </div>
      </div>

      <TextAreaField
        id="tag-description"
        label="Descrição"
        hint="(opcional)"
        maxLength={200}
        showCount
        rows={2}
        value={description}
        onChange={event => {
          setDescription(event.target.value)
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
