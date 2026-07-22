import { useEffect, type JSX } from 'react'
import { useForm, useWatch, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import {
  CategoryForm,
  type CategoryFormValues,
  type CategoryFormField,
} from '../../forms/CategoryForm'
import { TagForm, type TagFormValues, type TagFormField } from '../../forms/TagForm'
import type { ServerFormError } from '../../forms/serverFormError'
import {
  categoryFieldMap,
  categoryCodeFieldMap,
  tagFieldMap,
  tagCodeFieldMap,
} from '../../forms/fieldMaps'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { StatusMessage } from '../../components/StatusMessage'
import { useCreateInline } from '../../hooks/useCreateInline'
import {
  serviceFormSchema,
  SERVICE_NAME_MAX_LENGTH,
  SERVICE_DESCRIPTION_MAX_LENGTH,
  type ServiceFormInput,
  type ServiceFormValues,
  type ServiceFormField,
} from './ServiceForm.schema'

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
  serverError: ServerFormError<ServiceFormField> | null
  onCancel: () => void
  onSubmit: (values: ServiceFormValues) => Promise<void>
  onCreateCategory: (input: CreateCategoryInput) => Promise<Category>
  onCreateTag: (input: CreateTagInput) => Promise<Tag>
  onDirtyChange: (isDirty: boolean) => void
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
  serverError,
  onCancel,
  onSubmit,
  onCreateCategory,
  onCreateTag,
  onDirtyChange,
}: ServiceFormProps): JSX.Element {
  const {
    register,
    control,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors, isDirty },
  } = useForm<ServiceFormInput, unknown, ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: initialValues,
    mode: 'onTouched',
    reValidateMode: 'onChange',
  })
  const hasErrors = Object.keys(errors).length > 0
  const descriptionValue = useWatch({ control, name: 'description' })

  useEffect(() => {
    onDirtyChange(isDirty)
  }, [isDirty, onDirtyChange])

  useEffect(() => {
    if (serverError === null) {
      return
    }
    for (const [field, message] of Object.entries(serverError.fieldErrors)) {
      setError(field as ServiceFormField, { type: 'server', message })
    }
    if (serverError.firstField !== null) {
      setFocus(serverError.firstField)
    }
  }, [serverError, setError, setFocus])

  const createCategory = useCreateInline<Category, CreateCategoryInput, CategoryFormField>(
    onCreateCategory,
    categoryFieldMap,
    categoryCodeFieldMap,
    'Não foi possível criar a categoria.',
  )
  const createTag = useCreateInline<Tag, CreateTagInput, TagFormField>(
    onCreateTag,
    tagFieldMap,
    tagCodeFieldMap,
    'Não foi possível criar a etiqueta.',
  )

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
        maxLength={SERVICE_NAME_MAX_LENGTH}
        error={errors.name?.message}
        {...register('name')}
      />

      <TextAreaField
        id="service-description"
        label="Descrição"
        hint="(opcional)"
        rows={2}
        maxLength={SERVICE_DESCRIPTION_MAX_LENGTH}
        showCount
        currentLength={descriptionValue.length}
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
                    serverError={createCategory.serverError}
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
                  serverError={createTag.serverError}
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
        {errors.tagIds?.message !== undefined && (
          <p role="alert" className="mt-1 text-sm text-destructive">
            {errors.tagIds.message}
          </p>
        )}
      </div>

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
