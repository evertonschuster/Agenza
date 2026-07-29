import type { Category } from '@/features/catalog/domain/entities/Category'
import type { CategoriesListState } from '@/features/catalog/presentation/categories/pages/CategoriesListPage/hooks/useCategoriesListPage.types'

export interface CategoriesTableProps {
  state: CategoriesListState
  hasActiveSearch: boolean
  onRetry: () => void
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}
