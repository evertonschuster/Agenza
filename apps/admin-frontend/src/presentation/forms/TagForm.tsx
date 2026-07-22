import { useEffect, type JSX } from 'react'
import { useForm, useWatch, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TAG_COLOR_PALETTE } from '../../domain/entities/Tag'
import { TextField } from '../components/TextField'
import { TextAreaField } from '../components/TextAreaField'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { StatusMessage } from '../components/StatusMessage'
import type { ServerFormError } from './serverFormError'

const NAME_MESSAGE = 'O nome da etiqueta deve ter entre 1 e 40 caracteres'
const COLOR_MESSAGE = `A cor da etiqueta deve ser uma das seguintes: ${TAG_COLOR_PALETTE.join(', ')}`
const DESCRIPTION_MESSAGE = 'A descrição da etiqueta deve ter no máximo 200 caracteres'

const tagFormSchema = z.object({
  name: z.string().trim().min(1, NAME_MESSAGE).max(40, NAME_MESSAGE),
  color: z.enum(TAG_COLOR_PALETTE, { message: COLOR_MESSAGE }),
  description: z.string().trim().max(200, DESCRIPTION_MESSAGE),
})

export type TagFormValues = z.infer<typeof tagFormSchema>
export type TagFormField = keyof TagFormValues

interface TagFormProps {
  initialValues: TagFormValues
  submitLabel: string
  isSubmitting: boolean
  serverError: ServerFormError<TagFormField> | null
  onCancel: () => void
  onSubmit: (values: TagFormValues) => Promise<void>
}

export function TagForm({
  initialValues,
  submitLabel,
  isSubmitting,
  serverError,
  onCancel,
  onSubmit,
}: TagFormProps): JSX.Element {
  const {
    register,
    control,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<TagFormValues>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: initialValues,
    mode: 'onTouched',
    reValidateMode: 'onChange',
  })
  const selectedColor = useWatch({ control, name: 'color' })
  const descriptionValue = useWatch({ control, name: 'description' })
  const hasErrors = Object.keys(errors).length > 0

  useEffect(() => {
    if (serverError === null) {
      return
    }
    for (const [field, message] of Object.entries(serverError.fieldErrors)) {
      setError(field as TagFormField, { type: 'server', message })
    }
    if (serverError.firstField !== null) {
      setFocus(serverError.firstField)
    }
  }, [serverError, setError, setFocus])

  return (
    <form onSubmit={e => void handleSubmit(onSubmit)(e)} noValidate className="space-y-4">
      {/* No native `required` here - the browser's own constraint validation
          would intercept the submit event before react-hook-form ever sees
          it. zod already enforces required-ness with a proper message. */}
      <TextField
        id="tag-name"
        label="Nome"
        type="text"
        maxLength={40}
        error={errors.name?.message}
        {...register('name')}
      />

      <div>
        <span className="block text-sm font-medium text-foreground">Cor</span>
        <Controller
          control={control}
          name="color"
          render={({ field }) => (
            <div className="mt-1 flex flex-wrap gap-2">
              {TAG_COLOR_PALETTE.map(paletteColor => (
                <button
                  key={paletteColor}
                  type="button"
                  aria-label={`Cor ${paletteColor}`}
                  aria-pressed={selectedColor === paletteColor}
                  onClick={() => {
                    field.onChange(paletteColor)
                  }}
                  className={[
                    'h-7 w-7 rounded-full border-2',
                    selectedColor === paletteColor ? 'border-foreground' : 'border-transparent',
                  ].join(' ')}
                  style={{ backgroundColor: paletteColor }}
                />
              ))}
            </div>
          )}
        />
      </div>

      <TextAreaField
        id="tag-description"
        label="Descrição"
        hint="(opcional)"
        maxLength={200}
        showCount
        currentLength={descriptionValue.length}
        rows={2}
        error={errors.description?.message}
        {...register('description')}
      />

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
  )
}
