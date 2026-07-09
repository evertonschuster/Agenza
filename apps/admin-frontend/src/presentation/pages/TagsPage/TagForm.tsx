import { useState, type SubmitEvent, type JSX } from 'react'
import { TAG_COLOR_PALETTE, type TagColor } from '../../../domain/entities/Tag'

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

/** Shared by TagsPage's create and edit flows - the fields are identical. */
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
      <div>
        <label htmlFor="tag-name" className="block text-sm font-medium text-slate-800">
          Name
        </label>
        <input
          id="tag-name"
          type="text"
          required
          maxLength={40}
          value={name}
          onChange={event => {
            setName(event.target.value)
          }}
          className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <span className="block text-sm font-medium text-slate-800">Color</span>
        <div className="mt-1 flex gap-2">
          {TAG_COLOR_PALETTE.map(paletteColor => (
            <button
              key={paletteColor}
              type="button"
              aria-label={`Color ${paletteColor}`}
              aria-pressed={color === paletteColor}
              onClick={() => {
                setColor(paletteColor)
              }}
              className={[
                'h-7 w-7 rounded-full border-2',
                color === paletteColor ? 'border-slate-800' : 'border-transparent',
              ].join(' ')}
              style={{ backgroundColor: paletteColor }}
            />
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="tag-description" className="block text-sm font-medium text-slate-800">
          Description <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          id="tag-description"
          maxLength={200}
          rows={2}
          value={description}
          onChange={event => {
            setDescription(event.target.value)
          }}
          className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
        />
      </div>

      {error !== null && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving…' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
