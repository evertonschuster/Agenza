import { useEffect, type MouseEvent } from 'react'
import { useAuth } from '@/features/auth'
import { useServices } from '@/features/catalog/presentation/useServices'
import { useCategories } from '@/features/catalog/presentation/useCategories'
import { useTags } from '@/features/catalog/presentation/useTags'
import type { AsyncState } from '@/shared/presentation/hooks/useAsync'
import type { UiError } from '@/shared/application/UiError'
import type { Category } from '@/features/catalog/domain/entities/Category'
import type { Tag } from '@/features/catalog/domain/entities/Tag'
import type { Service } from '@/features/catalog/domain/entities/Service'
import { useServiceFilters } from '@/features/catalog/presentation/services/useServiceFilters'
import { useServiceEditor } from '@/features/catalog/presentation/services/useServiceEditor'
import { useServiceDeletion } from '@/features/catalog/presentation/services/useServiceDeletion'
import { toSelectLoadState } from '@/features/catalog/presentation/services/serviceFormatters'
import type {
  DiscardConfirmationViewModel,
  ServiceCategoryOptions,
  ServiceEditorViewModel,
  ServiceTagOptions,
} from '@/features/catalog/presentation/services/servicePresentationModels'

const ALL_CATEGORIES_VALUE = '__all_categories__'
const ALL_TAGS_VALUE = '__all_tags__'

interface ServicesFiltersViewModel {
  searchInput: string
  onSearchInputChange: (value: string) => void
  categoryFilter: string
  onCategoryFilterChange: (value: string) => void
  tagFilter: string
  onTagFilterChange: (value: string) => void
  categories: readonly Category[]
  tags: readonly Tag[]
  allCategoriesValue: string
  allTagsValue: string
}

interface ServicesListViewModel {
  services: readonly Service[]
  listState: AsyncState<readonly Service[], UiError>
  hasActiveFilters: boolean
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  onRetry: () => void
  onEdit: (service: Service, event: MouseEvent<HTMLButtonElement>) => void
  onDelete: (service: Service) => void
}

interface ServiceDeleteDialogViewModel {
  target: Service | null
  error: string | null
  isDeleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

export interface UseServicesPageResult {
  onOpenCreate: (event: MouseEvent<HTMLButtonElement>) => void
  filters: ServicesFiltersViewModel
  list: ServicesListViewModel
  dialog: {
    editor: ServiceEditorViewModel
    categoryOptions: ServiceCategoryOptions
    tagOptions: ServiceTagOptions
    discardConfirmation: DiscardConfirmationViewModel
  }
  deleteDialog: ServiceDeleteDialogViewModel
}

/** Composes the filters/list/editor/deletion hooks into ServicesPage's view models - owns no machine of its own. */
export function useServicesPage(): UseServicesPageResult {
  const { tenantContext } = useAuth()
  const filters = useServiceFilters()

  const {
    services,
    listState,
    page,
    pageSize,
    totalCount,
    setPage,
    refetch,
    createService,
    updateService,
    deleteService,
  } = useServices(tenantContext, {
    search: filters.debouncedSearch,
    ...(filters.categoryFilter !== '' ? { categoryId: filters.categoryFilter } : {}),
    ...(filters.tagFilter !== '' ? { tagId: filters.tagFilter } : {}),
  })
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const {
    categories,
    listState: categoriesListState,
    createCategory,
    refetch: refetchCategories,
  } = useCategories(tenantContext)
  const { tags, listState: tagsListState, createTag, refetch: refetchTags } = useTags(tenantContext)

  useEffect(() => {
    setPage(1)
    // Only re-run when a filter narrows the result set - setPage/page
    // themselves aren't inputs to this reset, they're what it resets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.debouncedSearch, filters.categoryFilter, filters.tagFilter])

  const editor = useServiceEditor({ onCreate: createService, onUpdate: updateService })
  const deletion = useServiceDeletion({ onDelete: deleteService })

  return {
    onOpenCreate: editor.onOpenCreate,
    filters: {
      searchInput: filters.searchInput,
      onSearchInputChange: filters.onSearchInputChange,
      categoryFilter: filters.categoryFilter,
      onCategoryFilterChange: filters.onCategoryFilterChange,
      tagFilter: filters.tagFilter,
      onTagFilterChange: filters.onTagFilterChange,
      categories,
      tags,
      allCategoriesValue: ALL_CATEGORIES_VALUE,
      allTagsValue: ALL_TAGS_VALUE,
    },
    list: {
      services,
      listState,
      hasActiveFilters: filters.hasActiveFilters,
      page,
      totalPages,
      onPageChange: setPage,
      onRetry: () => void refetch(),
      onEdit: editor.onOpenEdit,
      onDelete: deletion.onRequestDelete,
    },
    dialog: {
      editor: editor.editor,
      categoryOptions: {
        items: categories,
        loadState: toSelectLoadState(categoriesListState, () => void refetchCategories()),
        onCreate: createCategory,
      },
      tagOptions: {
        items: tags,
        loadState: toSelectLoadState(tagsListState, () => void refetchTags()),
        onCreate: createTag,
      },
      discardConfirmation: editor.discardConfirmation,
    },
    deleteDialog: {
      target: deletion.target,
      error: deletion.error,
      isDeleting: deletion.isDeleting,
      onCancel: deletion.onCancel,
      onConfirm: () => void deletion.onConfirm(),
    },
  }
}
