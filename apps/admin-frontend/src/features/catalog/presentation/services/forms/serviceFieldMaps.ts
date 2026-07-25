import type { ServiceFormField } from '@/features/catalog/presentation/services/forms/ServiceForm.schema'

// Kept out of ServiceForm.tsx itself: a component file exporting a plain
// runtime constant alongside its component breaks Vite Fast Refresh for
// that file (react-refresh/only-export-components).

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
