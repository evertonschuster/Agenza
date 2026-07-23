import { useEffect, useRef, useState, type MouseEvent, type RefObject } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useServices } from '../../hooks/useServices'
import { useCategories } from '../../hooks/useCategories'
import { useTags } from '../../hooks/useTags'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import type { Service } from '../../../domain/entities/Service'
import type { ServiceFormValues, ServiceFormField } from './ServiceForm.schema'
import { mapApiErrorToForm, type ServerFormError } from '../../forms/serverFormError'
import { serviceFieldMap, serviceCodeFieldMap } from '../../forms/fieldMaps'
import { toServiceInput, messageFrom, toAsyncSelectStatus } from './serviceFormatters'
import type { ServicesFiltersProps } from './ServicesFilters'
import type { ServicesTableProps } from './ServicesTable'
import type { ServiceDialogProps } from './ServiceDialog'
import type { ServiceDeleteDialogProps } from './ServiceDeleteDialog'

const ALL_CATEGORIES_VALUE = '__all_categories__'
const ALL_TAGS_VALUE = '__all_tags__'

export type ServiceFormTarget = 'new' | Service

interface UseServicesControllerResult {
  onOpenCreate: (event: MouseEvent<HTMLButtonElement>) => void
  filters: ServicesFiltersProps
  table: ServicesTableProps
  formDialog: Omit<ServiceDialogProps, 'discardConfirm'>
  discardConfirm: ServiceDialogProps['discardConfirm']
  deleteDialog: ServiceDeleteDialogProps
}

/**
 * Owns every piece of state ServicesPage composes: the filtered/paged list,
 * the create/edit dialog (including its dirty-tracking discard-confirm),
 * and the delete-confirm dialog. ServicesPage itself only renders
 * ServicesFilters/ServicesTable/ServiceDialog/ServiceDeleteDialog wired to
 * this hook's return value - it doesn't know about HTTP, repositories, or
 * any of the individual use cases.
 */
export function useServicesController(): UseServicesControllerResult {
  const { tenantContext } = useAuth()

  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebouncedValue(searchInput, 300)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')

  const {
    services,
    status,
    error,
    page,
    pageSize,
    totalCount,
    setPage,
    refetch,
    createService,
    updateService,
    deleteService,
  } = useServices(tenantContext, {
    search: debouncedSearch,
    ...(categoryFilter !== '' ? { categoryId: categoryFilter } : {}),
    ...(tagFilter !== '' ? { tagId: tagFilter } : {}),
  })
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const {
    categories,
    status: categoriesStatus,
    error: categoriesError,
    createCategory,
    refetch: refetchCategories,
  } = useCategories(tenantContext)
  const {
    tags,
    status: tagsStatus,
    error: tagsError,
    createTag,
    refetch: refetchTags,
  } = useTags(tenantContext)

  useEffect(() => {
    setPage(1)
    // Only re-run when a filter narrows the result set - setPage/page
    // themselves aren't inputs to this reset, they're what it resets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, categoryFilter, tagFilter])

  const [formTarget, setFormTarget] = useState<ServiceFormTarget | null>(null)
  const [displayTarget, setDisplayTarget] = useState<ServiceFormTarget | null>(null)
  const [serverError, setServerError] = useState<ServerFormError<ServiceFormField> | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFormDirty, setIsFormDirty] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  // Restores focus to whichever button opened the form dialog once it
  // closes, instead of relying on Radix's own previously-focused-element
  // fallback (unreliable when the open state is driven externally rather
  // than through a DialogTrigger, as here).
  const formTriggerRef: RefObject<HTMLButtonElement | null> = useRef(null)

  function openCreateForm(event: MouseEvent<HTMLButtonElement>): void {
    formTriggerRef.current = event.currentTarget
    setFormTarget('new')
    setDisplayTarget('new')
    setServerError(null)
    setIsFormDirty(false)
  }

  function openEditForm(service: Service, event: MouseEvent<HTMLButtonElement>): void {
    formTriggerRef.current = event.currentTarget
    setFormTarget(service)
    setDisplayTarget(service)
    setServerError(null)
    setIsFormDirty(false)
  }

  function closeForm(): void {
    // displayTarget is intentionally left as-is: Dialog fades out over ~100ms
    // after `open` flips to false, and clearing displayTarget here would
    // blank the title/form during that animation instead of after it.
    setFormTarget(null)
    setServerError(null)
    setIsFormDirty(false)
    setShowDiscardConfirm(false)
  }

  // Single interception point for every way the dialog can close (Escape,
  // the header close button, an overlay click, and the form's own Cancel
  // button all route through Dialog's onOpenChange/onCancel into this) - a
  // dirty form asks for confirmation instead of discarding silently.
  function requestCloseForm(): void {
    if (isFormDirty) {
      setShowDiscardConfirm(true)
      return
    }
    closeForm()
  }

  async function handleSubmit(values: ServiceFormValues): Promise<void> {
    setIsSubmitting(true)
    setServerError(null)
    try {
      if (formTarget === 'new') {
        await createService(toServiceInput(values))
      } else if (formTarget !== null) {
        await updateService(formTarget.id, toServiceInput(values))
      }
      closeForm()
    } catch (caughtError) {
      setServerError(
        mapApiErrorToForm(
          caughtError,
          serviceFieldMap,
          serviceCodeFieldMap,
          'Não foi possível salvar o serviço.',
        ),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function requestDelete(service: Service): void {
    setDeleteTarget(service)
    setDeleteError(null)
  }

  async function confirmDelete(): Promise<void> {
    if (deleteTarget === null) {
      return
    }
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deleteService(deleteTarget.id)
      setDeleteTarget(null)
    } catch (caughtError) {
      setDeleteError(messageFrom(caughtError, 'Não foi possível excluir o serviço.'))
    } finally {
      setIsDeleting(false)
    }
  }

  return {
    onOpenCreate: openCreateForm,
    filters: {
      searchInput,
      onSearchInputChange: setSearchInput,
      categoryFilter,
      onCategoryFilterChange: setCategoryFilter,
      tagFilter,
      onTagFilterChange: setTagFilter,
      categories,
      tags,
      allCategoriesValue: ALL_CATEGORIES_VALUE,
      allTagsValue: ALL_TAGS_VALUE,
    },
    table: {
      services,
      status,
      error,
      hasActiveFilters: debouncedSearch.trim() !== '' || categoryFilter !== '' || tagFilter !== '',
      page,
      totalPages,
      onPageChange: setPage,
      onRetry: () => void refetch(),
      onEdit: openEditForm,
      onDelete: requestDelete,
    },
    formDialog: {
      isOpen: formTarget !== null,
      displayTarget,
      code: displayTarget === 'new' || displayTarget === null ? null : displayTarget.code,
      submitLabel: displayTarget === 'new' ? 'Criar serviço' : 'Salvar alterações',
      title: displayTarget === 'new' ? 'Novo serviço' : 'Editar serviço',
      isSubmitting,
      serverError,
      formTriggerRef,
      onRequestClose: requestCloseForm,
      onSubmit: handleSubmit,
      onDirtyChange: setIsFormDirty,
      categories,
      categoriesStatus: toAsyncSelectStatus(categoriesStatus),
      categoriesError: categoriesError instanceof Error ? categoriesError.message : null,
      onRetryCategories: () => void refetchCategories(),
      onCreateCategory: createCategory,
      tags,
      tagsStatus: toAsyncSelectStatus(tagsStatus),
      tagsError: tagsError instanceof Error ? tagsError.message : null,
      onRetryTags: () => void refetchTags(),
      onCreateTag: createTag,
    },
    discardConfirm: {
      isOpen: showDiscardConfirm,
      onCancel: () => {
        setShowDiscardConfirm(false)
      },
      onConfirm: closeForm,
    },
    deleteDialog: {
      target: deleteTarget,
      error: deleteError,
      isDeleting,
      onCancel: () => {
        setDeleteTarget(null)
        setDeleteError(null)
      },
      onConfirm: () => void confirmDelete(),
    },
  }
}
