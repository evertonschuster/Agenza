import type { Category } from '@/features/catalog/domain/entities/Category'

export interface CategoriesTableProps {
  categories: readonly Category[]
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}
