import { useCallback, useState } from 'react'
import { useAppContainer } from './useAppContainer'
import { useAsync } from './useAsync'
import type { Service } from '../../domain/entities/Service'
import type { TenantContext } from '../../application/context/TenantContext'
import type {
  CreateServiceInput,
  PagedServices,
  UpdateServiceInput,
} from '../../application/repositories/ServiceRepository'

type UseServicesStatus = 'idle' | 'loading' | 'success' | 'error'

const DEFAULT_PAGE_SIZE = 20
const EMPTY_PAGE: PagedServices = {
  services: [],
  totalCount: 0,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
}

export interface UseServicesResult {
  services: Service[]
  status: UseServicesStatus
  error: unknown
  page: number
  pageSize: number
  totalCount: number
  setPage: (page: number) => void
  refetch: () => Promise<void>
  createService: (input: CreateServiceInput) => Promise<Service>
  updateService: (id: string, input: UpdateServiceInput) => Promise<Service>
  deleteService: (id: string) => Promise<void>
}

/**
 * tenantContext is nullable because the page can mount while its own
 * useAuth() call is still resolving (same brief window AdminLayout
 * already tolerates for the business name). Guards below no-op until
 * it resolves, then the changed tenantContext identity re-triggers the
 * fetch automatically (see useAsync: execute's identity follows listServices).
 */
export interface UseServicesFilters {
  search?: string
  categoryId?: string
  tagId?: string
}

export function useServices(
  tenantContext: TenantContext | null,
  filters: UseServicesFilters = {},
): UseServicesResult {
  const { useCases } = useAppContainer()
  const [page, setPage] = useState(1)
  const { search, categoryId, tagId } = filters

  const listServices = useCallback(async (): Promise<PagedServices> => {
    if (tenantContext === null) {
      return EMPTY_PAGE
    }
    return useCases.listServices.execute(tenantContext, {
      page,
      pageSize: DEFAULT_PAGE_SIZE,
      ...(search !== undefined ? { search } : {}),
      ...(categoryId !== undefined ? { categoryId } : {}),
      ...(tagId !== undefined ? { tagId } : {}),
    })
  }, [tenantContext, useCases, page, search, categoryId, tagId])

  const { data, status, error, execute, mutate } = useAsync(listServices, {
    resetKey: tenantContext?.tenant.id,
  })

  const createService = useCallback(
    async (input: CreateServiceInput): Promise<Service> => {
      if (tenantContext === null) {
        throw new Error('Não é possível criar um serviço sem um contexto de tenant autenticado')
      }
      const service = await useCases.createService.execute(tenantContext, input)
      // Insert immediately so the new service shows up as soon as the POST
      // succeeds - the mutation's success never depends on the background
      // refetch below. If that refetch fails, this optimistic entry is
      // what keeps the service visible (see useAsync's own status/error,
      // surfaced separately by the page).
      mutate(current =>
        current === null
          ? current
          : {
              ...current,
              services: [...current.services, service],
              totalCount: current.totalCount + 1,
            },
      )
      void execute()
      return service
    },
    [tenantContext, useCases, execute, mutate],
  )

  const updateService = useCallback(
    async (id: string, input: UpdateServiceInput): Promise<Service> => {
      if (tenantContext === null) {
        throw new Error('Não é possível atualizar um serviço sem um contexto de tenant autenticado')
      }
      const service = await useCases.updateService.execute(tenantContext, id, input)
      await execute()
      return service
    },
    [tenantContext, useCases, execute],
  )

  const deleteService = useCallback(
    async (id: string): Promise<void> => {
      if (tenantContext === null) {
        throw new Error('Não é possível excluir um serviço sem um contexto de tenant autenticado')
      }
      await useCases.deleteService.execute(tenantContext, id)
      const refreshed = await execute()
      // Deleting the last item on a page past the first leaves the user
      // stranded on a now-empty page - step back to the last page that
      // still has data instead (docs/adr/0012's frontend counterpart).
      if (refreshed?.services.length === 0 && page > 1) {
        setPage(page - 1)
      }
    },
    [tenantContext, useCases, execute, page],
  )

  return {
    services: data?.services ?? [],
    status,
    error,
    page,
    pageSize: data?.pageSize ?? DEFAULT_PAGE_SIZE,
    totalCount: data?.totalCount ?? 0,
    setPage,
    refetch: async () => {
      await execute()
    },
    createService,
    updateService,
    deleteService,
  }
}
