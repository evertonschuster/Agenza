import type { CategoryFormField } from '@/features/catalog/presentation/categories/pages/CategoryEditorDialog/forms/CategoryForm.types'

// Kept out of CategoryForm.tsx itself: a component file exporting a plain
// runtime constant alongside its component breaks Vite Fast Refresh for
// that file (react-refresh/only-export-components).

/** Backend PascalCase property name -> CategoryForm's field name. */
export const categoryFieldMap: Record<string, CategoryFormField> = {
  Name: 'name',
}

/** Conflict/NotFound/Forbidden `code` -> the CategoryForm field it should highlight. */
export const categoryCodeFieldMap: Record<string, CategoryFormField> = {
  'Category.DuplicateName': 'name',
}
