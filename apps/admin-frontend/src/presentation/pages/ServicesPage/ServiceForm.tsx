import { useState, type SubmitEvent, type JSX } from 'react'
import type { Category } from '../../../domain/entities/Category'
import { TAG_COLOR_PALETTE, type Tag } from '../../../domain/entities/Tag'
import type { CreateCategoryInput } from '../../../application/repositories/CategoryRepository'
import type { CreateTagInput } from '../../../application/repositories/TagRepository'
import { TextField } from '../../components/TextField'
import { TextAreaField } from '../../components/TextAreaField'
import { InlineCreatePopover } from '../../components/InlineCreatePopover'
import { CategoryForm, type CategoryFormValues } from '../CategoriesPage/CategoryForm'
import { TagForm, type TagFormValues } from '../TagsPage/TagForm'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { StatusMessage } from '../../components/StatusMessage'
import { Label } from '@/components/ui/label'
import { useFormValidation } from '../../hooks/useFormValidation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const EMPTY_CATEGORY_FORM_VALUES: CategoryFormValues = { name: '' }
const EMPTY_TAG_FORM_VALUES: TagFormValues = {
  name: '',
  color: TAG_COLOR_PALETTE[0],
  description: '',
}

export interface ServiceFormValues {
  name: string
  description: string
  durationMinutes: string
  minDurationMinutes: string
  maxDurationMinutes: string
  price: string
  maxDiscountPercentage: string
  categoryId: string
  tagIds: string[]
}

interface ServiceFormProps {
  code: number | null
  initialValues: ServiceFormValues
  categories: Category[]
  tags: Tag[]
  submitLabel: string
  isSubmitting: boolean
  error: string | null
  onCancel: () => void
  onSubmit: (values: ServiceFormValues) => Promise<void>
  onCreateCategory: (input: CreateCategoryInput) => Promise<Category>
  onCreateTag: (input: CreateTagInput) => Promise<Tag>
}

const NO_CATEGORY_VALUE = '__none__'

function validate(values: ServiceFormValues): string | null {
  if (values.name.trim().length === 0) {
    return 'Informe o nome do serviço.'
  }

  if (values.description.trim().length > 500) {
    return 'A descrição não pode exceder 500 caracteres.'
  }

  const duration = Number(values.durationMinutes)
  const minDuration = Number(values.minDurationMinutes)
  const maxDuration = Number(values.maxDurationMinutes)
  const price = Number(values.price)
  const maxDiscount = Number(values.maxDiscountPercentage)

  if (
    !Number.isFinite(duration) ||
    !Number.isFinite(minDuration) ||
    !Number.isFinite(maxDuration)
  ) {
    return 'Informe durações válidas em minutos.'
  }

  if (minDuration < 1) {
    return 'A duração mínima deve ser de pelo menos 1 minuto.'
  }

  if (minDuration > duration) {
    return 'A duração mínima não pode ser maior que a duração padrão.'
  }

  if (duration > maxDuration) {
    return 'A duração padrão não pode ser maior que a duração máxima.'
  }

  if (maxDuration > 1440) {
    return 'A duração máxima não pode exceder 1440 minutos (24 horas).'
  }

  if (!Number.isFinite(price) || price < 0) {
    return 'O preço não pode ser negativo.'
  }

  if (!Number.isFinite(maxDiscount) || maxDiscount < 0 || maxDiscount > 100) {
    return 'O desconto máximo deve estar entre 0 e 100%.'
  }

  return null
}

export function ServiceForm({
  code,
  initialValues,
  categories,
  tags,
  submitLabel,
  isSubmitting,
  error,
  onCancel,
  onSubmit,
  onCreateCategory,
  onCreateTag,
}: ServiceFormProps): JSX.Element {
  const [name, setName] = useState(initialValues.name)
  const [description, setDescription] = useState(initialValues.description)
  const [durationMinutes, setDurationMinutes] = useState(initialValues.durationMinutes)
  const [minDurationMinutes, setMinDurationMinutes] = useState(initialValues.minDurationMinutes)
  const [maxDurationMinutes, setMaxDurationMinutes] = useState(initialValues.maxDurationMinutes)
  const [price, setPrice] = useState(initialValues.price)
  const [maxDiscountPercentage, setMaxDiscountPercentage] = useState(
    initialValues.maxDiscountPercentage,
  )
  const [categoryId, setCategoryId] = useState(initialValues.categoryId)
  const [tagIds, setTagIds] = useState<string[]>(initialValues.tagIds)
  const {
    markTouched,
    displayedError: displayedValidationErrorFor,
    validateForSubmit,
  } = useFormValidation(validate)
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [categoryCreateError, setCategoryCreateError] = useState<string | null>(null)
  const [isCreatingTag, setIsCreatingTag] = useState(false)
  const [tagCreateError, setTagCreateError] = useState<string | null>(null)

  function toggleTag(tagId: string): void {
    setTagIds(current =>
      current.includes(tagId) ? current.filter(id => id !== tagId) : [...current, tagId],
    )
  }

  async function handleCreateCategory(
    values: CategoryFormValues,
    close: () => void,
  ): Promise<void> {
    setIsCreatingCategory(true)
    setCategoryCreateError(null)
    try {
      const category = await onCreateCategory({ name: values.name.trim() })
      setCategoryId(category.id)
      close()
    } catch (caughtError) {
      setCategoryCreateError(
        caughtError instanceof Error ? caughtError.message : 'Não foi possível criar a categoria.',
      )
    } finally {
      setIsCreatingCategory(false)
    }
  }

  async function handleCreateTag(values: TagFormValues, close: () => void): Promise<void> {
    setIsCreatingTag(true)
    setTagCreateError(null)
    try {
      const description = values.description.trim()
      const tag = await onCreateTag({
        name: values.name.trim(),
        color: values.color,
        ...(description !== '' ? { description } : {}),
      })
      setTagIds(current => (current.includes(tag.id) ? current : [...current, tag.id]))
      close()
    } catch (caughtError) {
      setTagCreateError(
        caughtError instanceof Error ? caughtError.message : 'Não foi possível criar a etiqueta.',
      )
    } finally {
      setIsCreatingTag(false)
    }
  }

  const values: ServiceFormValues = {
    name,
    description,
    durationMinutes,
    minDurationMinutes,
    maxDurationMinutes,
    price,
    maxDiscountPercentage,
    categoryId,
    tagIds,
  }
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
        required
        maxLength={80}
        value={name}
        onChange={event => {
          setName(event.target.value)
        }}
      />

      <TextAreaField
        id="service-description"
        label="Descrição"
        hint="(opcional)"
        rows={2}
        maxLength={500}
        showCount
        value={description}
        onChange={event => {
          setDescription(event.target.value)
        }}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <TextField
          id="service-min-duration"
          label="Duração mínima (min)"
          type="number"
          min={1}
          required
          value={minDurationMinutes}
          onChange={event => {
            setMinDurationMinutes(event.target.value)
          }}
        />
        <TextField
          id="service-duration"
          label="Duração (min)"
          type="number"
          min={1}
          required
          value={durationMinutes}
          onChange={event => {
            setDurationMinutes(event.target.value)
          }}
        />
        <TextField
          id="service-max-duration"
          label="Duração máxima (min)"
          type="number"
          min={1}
          required
          value={maxDurationMinutes}
          onChange={event => {
            setMaxDurationMinutes(event.target.value)
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="service-price"
          label="Preço"
          type="number"
          min={0}
          step="0.01"
          required
          value={price}
          onChange={event => {
            setPrice(event.target.value)
          }}
        />
        <TextField
          id="service-max-discount"
          label="Desconto máximo (%)"
          type="number"
          min={0}
          max={100}
          required
          value={maxDiscountPercentage}
          onChange={event => {
            setMaxDiscountPercentage(event.target.value)
          }}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="service-category">Categoria</Label>
          <InlineCreatePopover triggerLabel="Nova categoria" title="Nova categoria">
            {close => (
              <CategoryForm
                initialValues={EMPTY_CATEGORY_FORM_VALUES}
                submitLabel="Criar categoria"
                isSubmitting={isCreatingCategory}
                error={categoryCreateError}
                onCancel={close}
                onSubmit={values => handleCreateCategory(values, close)}
              />
            )}
          </InlineCreatePopover>
        </div>
        <Select
          // Forces Radix's Select to remount whenever the category list grows,
          // instead of updating `value` to an id its hidden bubble-select
          // hasn't registered an <option> for yet - without this, selecting
          // the just-created category (below) gets silently reset back to
          // "Sem categoria" by Radix's own change handling.
          key={categories.length}
          value={categoryId === '' ? NO_CATEGORY_VALUE : categoryId}
          onValueChange={value => {
            setCategoryId(value === NO_CATEGORY_VALUE ? '' : value)
          }}
        >
          <SelectTrigger id="service-category" className="w-full">
            <SelectValue placeholder="Sem categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_CATEGORY_VALUE}>Sem categoria</SelectItem>
            {categories.map(category => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <span className="block text-sm font-medium text-foreground">Etiquetas</span>
          <InlineCreatePopover triggerLabel="Nova etiqueta" title="Nova etiqueta">
            {close => (
              <TagForm
                initialValues={EMPTY_TAG_FORM_VALUES}
                submitLabel="Criar etiqueta"
                isSubmitting={isCreatingTag}
                error={tagCreateError}
                onCancel={close}
                onSubmit={values => handleCreateTag(values, close)}
              />
            )}
          </InlineCreatePopover>
        </div>
        <div className="mt-1 flex flex-wrap gap-2">
          {tags.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma etiqueta cadastrada.</p>
          )}
          {tags.map(tag => (
            <button
              key={tag.id}
              type="button"
              aria-pressed={tagIds.includes(tag.id)}
              onClick={() => {
                toggleTag(tag.id)
              }}
              className={[
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors',
                tagIds.includes(tag.id)
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: tag.color }}
                aria-hidden="true"
              />
              {tag.name}
            </button>
          ))}
        </div>
      </div>

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
