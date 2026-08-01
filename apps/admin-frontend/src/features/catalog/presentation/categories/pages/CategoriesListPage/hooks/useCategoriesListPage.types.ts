import type { Category } from '@/features/catalog/domain/entities/Category'
import type { AsyncState } from '@/shared/presentation/hooks/useAsync'
import type { UiError } from '@/shared/application/UiError'
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from '@/features/catalog/application/repositories/CategoryRepository'

/** What the nested CategoryEditorDialog route reads via useOutletContext - the
 * page hook's own list state and mutations, not a separate useCategories hook. */
export interface CategoriesEditorContext {
  categories: readonly Category[]
  listState: AsyncState<readonly Category[], UiError>
  refetch: () => Promise<void>
  createCategory: (input: CreateCategoryInput) => Promise<Category>
  updateCategory: (id: string, input: UpdateCategoryInput) => Promise<Category>
}

export interface UseCategoriesListPageResult {
  categories: readonly Category[]
  listState: AsyncState<readonly Category[], UiError>
  onRetry: () => void
  onDelete: (category: Category) => void
  deleteDialog: {
    target: Category | null
    error: string | null
    isDeleting: boolean
    onCancel: () => void
    onConfirm: () => void
  }
  editorContext: CategoriesEditorContext
}
