import { z } from 'zod'

// Kept out of ServiceForm.tsx itself: a component file exporting plain
// runtime constants (the schema, the field/code maps) alongside its
// component breaks Vite Fast Refresh for that file
// (react-refresh/only-export-components).

const NAME_MAX_LENGTH = 80
const DESCRIPTION_MAX_LENGTH = 500
const MAX_ALLOWED_DURATION_MINUTES = 1440
const PRICE_MAX_DECIMALS = 2
const DISCOUNT_MAX_DECIMALS = 2

// The inferred Zod chain type (ZodPipe<ZodString, ZodTransform<number, string>>
// in v4) is impractical to spell out by hand and would need updating on every
// zod upgrade - inference is more robust here than a hand-written annotation.
//
// Duration fields are `int` in the backend DTO (CreateServiceCommand) - a
// fractional value like "30.5" would fail there, so it's rejected here too
// instead of being silently truncated or bounced back as a server error.
// A plain digit regex rejects scientific notation ("3e1") and Infinity/NaN
// up front too.
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function integerField(message: string) {
  return z
    .string()
    .refine(value => /^-?\d+$/.test(value.trim()), message)
    .transform(value => Number(value.trim()))
}

// Price/discount are `decimal` with PrecisionScale(_, 2) in the backend
// validator - mirrored here so a value the UI would round-trip incorrectly
// (e.g. "10.123") never reaches the server. The sign is allowed through so
// a negative amount still fails via the superRefine below with its own
// domain-specific message, instead of this generic format message.
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function decimalField(maxDecimals: number, message: string) {
  const pattern = new RegExp(`^-?\\d+(\\.\\d{1,${String(maxDecimals)}})?$`)
  return z
    .string()
    .refine(value => pattern.test(value.trim()), message)
    .transform(value => Number(value.trim()))
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
    durationMinutes: integerField('Informe uma duração válida em minutos inteiros.'),
    minDurationMinutes: integerField('Informe uma duração válida em minutos inteiros.'),
    maxDurationMinutes: integerField('Informe uma duração válida em minutos inteiros.'),
    price: decimalField(
      PRICE_MAX_DECIMALS,
      'Informe um preço válido, com no máximo duas casas decimais.',
    ),
    maxDiscountPercentage: decimalField(
      DISCOUNT_MAX_DECIMALS,
      'Informe um desconto válido, com no máximo duas casas decimais.',
    ),
    categoryId: z.string().nullable(),
    tagIds: z.array(z.string()),
  })
  .superRefine((values, ctx) => {
    // A sibling field that fails its own integerField/decimalField refine is
    // passed through here as its original raw string (zod still runs
    // superRefine even when another field in the same object failed) -
    // comparing against it with
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
