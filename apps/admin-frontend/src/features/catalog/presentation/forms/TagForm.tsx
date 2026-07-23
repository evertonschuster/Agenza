import { useEffect, type JSX } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TAG_COLOR_PALETTE } from '@/features/catalog/domain/entities/Tag'
import { TextField } from '@/shared/presentation/components/TextField'
import { TextAreaField } from '@/shared/presentation/components/TextAreaField'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { StatusMessage } from '@/shared/presentation/components/StatusMessage'
import type { ServerFormError } from '@/shared/presentation/forms/serverFormError'

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
  const descriptionValue = useWatch({ control, name: 'description' })
  const hasErrors = Object.keys(errors).length > 0
  const colorErrorId = 'tag-color-error'

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

      <fieldset>
        <legend className="text-sm font-medium text-foreground">Cor</legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {TAG_COLOR_PALETTE.map(paletteColor => (
            <label key={paletteColor} className="relative inline-block size-7 cursor-pointer">
              <input
                type="radio"
                value={paletteColor}
                aria-label={`Cor ${paletteColor}`}
                aria-invalid={errors.color !== undefined}
                aria-describedby={errors.color !== undefined ? colorErrorId : undefined}
                className="peer absolute inset-0 size-7 cursor-pointer appearance-none outline-none"
                {...register('color')}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 block rounded-full border-2 border-transparent peer-checked:border-foreground peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 peer-aria-invalid:ring-3 peer-aria-invalid:ring-destructive/20"
                style={{ backgroundColor: paletteColor }}
              />
            </label>
          ))}
        </div>
        {errors.color?.message !== undefined && (
          <p id={colorErrorId} role="alert" className="mt-1 text-sm text-destructive">
            {errors.color.message}
          </p>
        )}
      </fieldset>

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
