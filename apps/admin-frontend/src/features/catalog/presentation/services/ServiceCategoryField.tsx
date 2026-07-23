import type { JSX } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import type { Category } from '@/features/catalog/domain/entities/Category'
import type { CreateCategoryInput } from '@/features/catalog/application/repositories/CategoryRepository'
import { CreatableSingleSelect } from '@/shared/presentation/components/CreatableSingleSelect'
import {
  CategoryForm,
  type CategoryFormValues,
  type CategoryFormField,
} from '@/features/catalog/presentation/forms/CategoryForm'
import {
  categoryFieldMap,
  categoryCodeFieldMap,
} from '@/features/catalog/presentation/forms/fieldMaps'
import { useCreateInline } from '@/shared/presentation/hooks/useCreateInline'
import type { ServiceCategoryOptions } from '@/features/catalog/presentation/services/servicePresentationModels'
import type {
  ServiceFormInput,
  ServiceFormValues,
} from '@/features/catalog/presentation/services/ServiceForm.schema'

const EMPTY_CATEGORY_FORM_VALUES: CategoryFormValues = { name: '' }

function toCategoryInput(values: CategoryFormValues): CreateCategoryInput {
  return { name: values.name }
}

export interface ServiceCategoryFieldProps {
  options: ServiceCategoryOptions
}

export function ServiceCategoryField({ options }: ServiceCategoryFieldProps): JSX.Element {
  const {
    control,
    formState: { errors },
  } = useFormContext<ServiceFormInput, unknown, ServiceFormValues>()
  const createCategory = useCreateInline<Category, CreateCategoryInput, CategoryFormField>(
    options.onCreate,
    categoryFieldMap,
    categoryCodeFieldMap,
    'Não foi possível criar a categoria.',
  )

  return (
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
              ref={field.ref}
              id="service-category"
              label="Categoria"
              items={options.items}
              value={field.value}
              getKey={category => category.id}
              getLabel={category => category.name}
              onChange={field.onChange}
              nullLabel="Sem categoria"
              searchPlaceholder="Buscar categoria…"
              emptyText="Nenhuma categoria encontrada."
              createActionLabel="Nova categoria"
              loadState={options.loadState}
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
      {errors.categoryId?.message !== undefined && (
        <p role="alert" className="mt-1 text-sm text-destructive">
          {errors.categoryId.message}
        </p>
      )}
    </div>
  )
}
