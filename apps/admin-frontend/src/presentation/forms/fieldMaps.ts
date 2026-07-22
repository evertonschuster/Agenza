import type { CategoryFormField } from './CategoryForm'
import type { TagFormField } from './TagForm'
import type { ServiceFormField } from '../pages/ServicesPage/ServiceForm.schema'

// Kept out of the *Form.tsx files themselves: a component file exporting a
// plain runtime constant alongside its component breaks Vite Fast Refresh
// for that file (react-refresh/only-export-components).

/** Backend PascalCase property name -> CategoryForm's field name. */
export const categoryFieldMap: Record<string, CategoryFormField> = {
  Name: 'name',
}

/** Conflict/NotFound/Forbidden `code` -> the CategoryForm field it should highlight. */
export const categoryCodeFieldMap: Record<string, CategoryFormField> = {
  'Category.DuplicateName': 'name',
}

/** Backend PascalCase property name -> TagForm's field name. */
export const tagFieldMap: Record<string, TagFormField> = {
  Name: 'name',
  Color: 'color',
  Description: 'description',
}

/** Conflict/NotFound/Forbidden `code` -> the TagForm field it should highlight. */
export const tagCodeFieldMap: Record<string, TagFormField> = {
  'Tag.DuplicateName': 'name',
}

/** Backend PascalCase property name -> ServiceForm's field name. */
export const serviceFieldMap: Record<string, ServiceFormField> = {
  Name: 'name',
  Description: 'description',
  DurationMinutes: 'durationMinutes',
  MinDurationMinutes: 'minDurationMinutes',
  MaxDurationMinutes: 'maxDurationMinutes',
  Price: 'price',
  MaxDiscountPercentage: 'maxDiscountPercentage',
  CategoryId: 'categoryId',
  TagIds: 'tagIds',
}

/** Conflict/NotFound/Forbidden `code` -> the ServiceForm field it should highlight. */
export const serviceCodeFieldMap: Record<string, ServiceFormField> = {
  'Service.DuplicateName': 'name',
}
