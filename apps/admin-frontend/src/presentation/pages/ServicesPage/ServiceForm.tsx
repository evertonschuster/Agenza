import type { JSX } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Category } from '../../../domain/entities/Category'
import { TAG_COLOR_PALETTE, type Tag } from '../../../domain/entities/Tag'
import type { CreateCategoryInput } from '../../../application/repositories/CategoryRepository'
import type { CreateTagInput } from '../../../application/repositories/TagRepository'
import { TextField } from '../../components/TextField'
import { TextAreaField } from '../../components/TextAreaField'
import {
  CreatableSingleSelect,
  type CreatableSelectStatus,
} from '../../components/CreatableSingleSelect'
import { CreatableMultiSelect } from '../../components/CreatableMultiSelect'
import { CategoryForm, type CategoryFormValues } from '../../forms/CategoryForm'
import { TagForm, type TagFormValues } from '../../forms/TagForm'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { StatusMessage } from '../../components/StatusMessage'
import { useCreateInline } from '../../hooks/useCreateInline'

const EMPTY_CATEGORY_FORM_VALUES: CategoryFormValues = { name: '' }
const EMPTY_TAG_FORM_VALUES: TagFormValues = {
  name: '',
  color: TAG_COLOR_PALETTE[0],
  description: '',
}

function toCategoryInput(values: CategoryFormValues): CreateCategoryInput {
  return { name: values.name }
}

function toTagInput(values: TagFormValues): CreateTagInput {
  const description = values.description.trim()
  return {
    name: values.name,
    color: values.color,
    ...(description !== '' ? { description } : {}),
  }
}

const NAME_MAX_LENGTH = 80
const DESCRIPTION_MAX_LENGTH = 500
const MAX_ALLOWED_DURATION_MINUTES = 1440

function numberField(message: string) {
  return z
    .string()
    .refine(value => value.trim() !== '' && Number.isFinite(Number(value)), message)
    .transform(value => Number(value))
}

const serviceFormSchema = z
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
  })

export type ServiceFormInput = z.input<typeof serviceFormSchema>
export type ServiceFormValues = z.output<typeof serviceFormSchema>

interface ServiceFormProps {
  code: number | null
  initialValues: ServiceFormInput
  categories: Category[]
  categoriesStatus: CreatableSelectStatus
  categoriesError: string | null
  onRetryCategories: () => void
  tags: Tag[]
  tagsStatus: CreatableSelectStatus
  tagsError: string | null
  onRetryTags: () => void
  submitLabel: string
  isSubmitting: boolean
  error: string | null
  onCancel: () => void
  onSubmit: (values: ServiceFormValues) => Promise<void>
  onCreateCategory: (input: CreateCategoryInput) => Promise<Category>
  onCreateTag: (input: CreateTagInput) => Promise<Tag>
}

export function ServiceForm({
  code,
  initialValues,
  categories,
  categoriesStatus,
  categoriesError,
  onRetryCategories,
  tags,
  tagsStatus,
  tagsError,
  onRetryTags,
  submitLabel,
  isSubmitting,
  error,
  onCancel,
  onSubmit,
  onCreateCategory,
  onCreateTag,
}: ServiceFormProps): JSX.Element {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ServiceFormInput, unknown, ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: initialValues,
    mode: 'onTouched',
    reValidateMode: 'onChange',
  })
  const hasErrors = Object.keys(errors).length > 0

  const createCategory = useCreateInline<Category, CreateCategoryInput>(onCreateCategory)
  const createTag = useCreateInline<Tag, CreateTagInput>(onCreateTag)

  return (
    <form onSubmit={e => void handleSubmit(onSubmit)(e)} noValidate className="space-y-4">
      {/* No native required/min/max here - the browser's own constraint
          validation would intercept the submit event before react-hook-form
          ever sees it. zod's schema above enforces every one of these rules
          with its own accessible, field-scoped error message. */}
      {code !== null && (
        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-foreground">Código</span>
          <p className="text-sm text-muted-foreground">{code}</p>
        </div>
      )}

      <TextField
        id="service-name"
        label="Nome"
        type="text"
        maxLength={NAME_MAX_LENGTH}
        error={errors.name?.message}
        {...register('name')}
      />

      <TextAreaField
        id="service-description"
        label="Descrição"
        hint="(opcional)"
        rows={2}
        maxLength={DESCRIPTION_MAX_LENGTH}
        showCount
        error={errors.description?.message}
        {...register('description')}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <TextField
          id="service-min-duration"
          label="Duração mínima (min)"
          type="number"
          error={errors.minDurationMinutes?.message}
          {...register('minDurationMinutes')}
        />
        <TextField
          id="service-duration"
          label="Duração (min)"
          type="number"
          error={errors.durationMinutes?.message}
          {...register('durationMinutes')}
        />
        <TextField
          id="service-max-duration"
          label="Duração máxima (min)"
          type="number"
          error={errors.maxDurationMinutes?.message}
          {...register('maxDurationMinutes')}
        />
      </div>

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

      <div className="space-y-1.5">
        <Controller
          control={control}
          name="categoryId"
          render={({ field }) => (
            <>
              <label htmlFor="service-category" className="text-sm font-medium text-foreground">
                Categoria
              </label>
              <CreatableSingleSelect
                id="service-category"
                label="Categoria"
                items={categories}
                value={field.value}
                getKey={category => category.id}
                getLabel={category => category.name}
                onChange={field.onChange}
                nullLabel="Sem categoria"
                searchPlaceholder="Buscar categoria…"
                emptyText="Nenhuma categoria encontrada."
                createActionLabel="Nova categoria"
                status={categoriesStatus}
                error={categoriesError}
                onRetry={onRetryCategories}
                renderCreateForm={({ close, onCreated }) => (
                  <CategoryForm
                    initialValues={EMPTY_CATEGORY_FORM_VALUES}
                    submitLabel="Criar categoria"
                    isSubmitting={createCategory.isCreating}
                    error={createCategory.error}
                    onCancel={() => {
                      createCategory.reset()
                      close()
                    }}
                    onSubmit={values => createCategory.create(toCategoryInput(values), onCreated)}
                  />
                )}
              />
            </>
          )}
        />
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium text-foreground">Etiquetas</span>
        <Controller
          control={control}
          name="tagIds"
          render={({ field }) => (
            <CreatableMultiSelect
              id="service-tags"
              label="Etiquetas"
              items={tags}
              values={field.value}
              getKey={tag => tag.id}
              getLabel={tag => tag.name}
              getColor={tag => tag.color}
              onChange={field.onChange}
              placeholder="Selecionar etiquetas"
              searchPlaceholder="Buscar etiqueta…"
              emptyText="Nenhuma etiqueta encontrada."
              createActionLabel="Nova etiqueta"
              status={tagsStatus}
              error={tagsError}
              onRetry={onRetryTags}
              renderCreateForm={({ close, onCreated }) => (
                <TagForm
                  initialValues={EMPTY_TAG_FORM_VALUES}
                  submitLabel="Criar etiqueta"
                  isSubmitting={createTag.isCreating}
                  error={createTag.error}
                  onCancel={() => {
                    createTag.reset()
                    close()
                  }}
                  onSubmit={values => createTag.create(toTagInput(values), onCreated)}
                />
              )}
            />
          )}
        />
      </div>

      {error !== null && <StatusMessage tone="error">{error}</StatusMessage>}

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
