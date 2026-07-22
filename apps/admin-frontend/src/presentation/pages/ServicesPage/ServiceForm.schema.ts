import { z } from 'zod'

// Kept out of ServiceForm.tsx itself: a component file exporting plain
// runtime constants (the schema, the field/code maps) alongside its
// component breaks Vite Fast Refresh for that file
// (react-refresh/only-export-components).

const NAME_MAX_LENGTH = 80
const DESCRIPTION_MAX_LENGTH = 500
const MAX_ALLOWED_DURATION_MINUTES = 1440

// The inferred Zod chain type (ZodPipe<ZodString, ZodTransform<number, string>>
// in v4) is impractical to spell out by hand and would need updating on every
// zod upgrade - inference is more robust here than a hand-written annotation.
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function numberField(message: string) {
  return z
    .string()
    .refine(value => value.trim() !== '' && Number.isFinite(Number(value)), message)
    .transform(value => Number(value))
}

export const serviceFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Informe o nome do serviço.')
      .max(
        NAME_MAX_LENGTH,
        `O nome do serviço deve ter no máximo ${String(NAME_MAX_LENGTH)} caracteres.`,
      ),
    description: z
      .string()
      .trim()
      .max(
        DESCRIPTION_MAX_LENGTH,
        `A descrição não pode exceder ${String(DESCRIPTION_MAX_LENGTH)} caracteres.`,
      ),
    durationMinutes: numberField('Informe durações válidas em minutos.'),
    minDurationMinutes: numberField('Informe durações válidas em minutos.'),
    maxDurationMinutes: numberField('Informe durações válidas em minutos.'),
    price: numberField('Informe um preço válido.'),
    maxDiscountPercentage: numberField('Informe um desconto válido.'),
    categoryId: z.string().nullable(),
    tagIds: z.array(z.string()),
  })
  .superRefine((values, ctx) => {
    // A sibling field that fails its own numberField refine is passed through
    // here as its original raw string (zod still runs superRefine even when
    // another field in the same object failed) - comparing against it with
    // `<`/`>` would coerce it (e.g. '' becomes 0) and produce a spurious
    // cross-field error. Only compare fields that actually parsed as numbers.
    const isNumber = (value: unknown): value is number =>
      typeof value === 'number' && Number.isFinite(value)
    const min = values.minDurationMinutes
    const duration = values.durationMinutes
    const max = values.maxDurationMinutes
    const price = values.price
    const discount = values.maxDiscountPercentage

    if (isNumber(min) && min < 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['minDurationMinutes'],
        message: 'A duração mínima deve ser de pelo menos 1 minuto.',
      })
    }

    if (isNumber(min) && isNumber(duration) && min > duration) {
      ctx.addIssue({
        code: 'custom',
        path: ['minDurationMinutes'],
        message: 'A duração mínima não pode ser maior que a duração padrão.',
      })
    } else if (isNumber(duration) && isNumber(max) && duration > max) {
      ctx.addIssue({
        code: 'custom',
        path: ['maxDurationMinutes'],
        message: 'A duração padrão não pode ser maior que a duração máxima.',
      })
    }

    if (isNumber(max) && max > MAX_ALLOWED_DURATION_MINUTES) {
      ctx.addIssue({
        code: 'custom',
        path: ['maxDurationMinutes'],
        message: `A duração máxima não pode exceder ${String(MAX_ALLOWED_DURATION_MINUTES)} minutos (24 horas).`,
      })
    }

    if (isNumber(price) && price < 0) {
      ctx.addIssue({ code: 'custom', path: ['price'], message: 'O preço não pode ser negativo.' })
    }

    if (isNumber(discount) && (discount < 0 || discount > 100)) {
      ctx.addIssue({
        code: 'custom',
        path: ['maxDiscountPercentage'],
        message: 'O desconto máximo deve estar entre 0 e 100%.',
      })
    }

    if (new Set(values.tagIds).size !== values.tagIds.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['tagIds'],
        message: 'A lista de etiquetas não pode conter itens duplicados.',
      })
    }
  })

export type ServiceFormInput = z.input<typeof serviceFormSchema>
export type ServiceFormValues = z.output<typeof serviceFormSchema>
export type ServiceFormField = keyof ServiceFormInput

export const SERVICE_NAME_MAX_LENGTH = NAME_MAX_LENGTH
export const SERVICE_DESCRIPTION_MAX_LENGTH = DESCRIPTION_MAX_LENGTH
