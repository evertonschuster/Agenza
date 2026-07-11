import { useState, type SubmitEvent, type JSX } from 'react'
import { TAG_COLOR_PALETTE, type TagColor } from '../../../domain/entities/Tag'
import { TextField } from '../../components/TextField'
import { TextAreaField } from '../../components/TextAreaField'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { StatusMessage } from '../../components/StatusMessage'

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

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault()
    void onSubmit({ name, color, description })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        rows={2}
        value={description}
        onChange={event => {
          setDescription(event.target.value)
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
