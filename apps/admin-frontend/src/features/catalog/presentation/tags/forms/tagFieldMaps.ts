import type { TagFormField } from '@/features/catalog/presentation/tags/forms/TagForm'

// Kept out of TagForm.tsx itself: a component file exporting a plain
// runtime constant alongside its component breaks Vite Fast Refresh for
// that file (react-refresh/only-export-components).

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
