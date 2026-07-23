import type { JSX } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import { TAG_COLOR_PALETTE, type Tag } from '@/features/catalog/domain/entities/Tag'
import type { CreateTagInput } from '@/features/catalog/application/repositories/TagRepository'
import { CreatableMultiSelect } from '@/shared/presentation/components/CreatableMultiSelect'
import {
  TagForm,
  type TagFormValues,
  type TagFormField,
} from '@/features/catalog/presentation/forms/TagForm'
import { tagFieldMap, tagCodeFieldMap } from '@/features/catalog/presentation/forms/fieldMaps'
import { useCreateInline } from '@/shared/presentation/hooks/useCreateInline'
import type { ServiceTagOptions } from '@/features/catalog/presentation/services/servicePresentationModels'
import type {
  ServiceFormInput,
  ServiceFormValues,
} from '@/features/catalog/presentation/services/ServiceForm.schema'

const EMPTY_TAG_FORM_VALUES: TagFormValues = {
  name: '',
  color: TAG_COLOR_PALETTE[0],
  description: '',
}

function toTagInput(values: TagFormValues): CreateTagInput {
  const description = values.description.trim()
  return {
    name: values.name,
    color: values.color,
    ...(description !== '' ? { description } : {}),
  }
}

export interface ServiceTagsFieldProps {
  options: ServiceTagOptions
}

export function ServiceTagsField({ options }: ServiceTagsFieldProps): JSX.Element {
  const {
    control,
    formState: { errors },
  } = useFormContext<ServiceFormInput, unknown, ServiceFormValues>()
  const createTag = useCreateInline<Tag, CreateTagInput, TagFormField>(
    options.onCreate,
    tagFieldMap,
    tagCodeFieldMap,
    'Não foi possível criar a etiqueta.',
  )

  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-foreground">Etiquetas</span>
      <Controller
        control={control}
        name="tagIds"
        render={({ field }) => (
          <CreatableMultiSelect
            ref={field.ref}
            id="service-tags"
            label="Etiquetas"
            items={options.items}
            values={field.value}
            getKey={tag => tag.id}
            getLabel={tag => tag.name}
            getColor={tag => tag.color}
            onChange={field.onChange}
            placeholder="Selecionar etiquetas"
            searchPlaceholder="Buscar etiqueta…"
            emptyText="Nenhuma etiqueta encontrada."
            createActionLabel="Nova etiqueta"
            loadState={options.loadState}
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
  )
}
