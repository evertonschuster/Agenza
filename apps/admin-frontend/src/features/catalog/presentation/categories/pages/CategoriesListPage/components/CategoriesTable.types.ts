import type { Category } from '@/features/catalog/domain/entities/Category'
import type { AsyncState } from '@/shared/presentation/hooks/useAsync'
import type { UiError } from '@/shared/application/UiError'

export interface CategoriesTableProps {
  categories: readonly Category[]
  listState: AsyncState<readonly Category[], UiError>
  hasActiveSearch: boolean
  onRetry: () => void
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}
