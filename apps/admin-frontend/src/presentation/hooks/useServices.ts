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
export function useServices(tenantContext: TenantContext | null): UseServicesResult {
  const { useCases } = useAppContainer()
  const [page, setPage] = useState(1)

  const listServices = useCallback(async (): Promise<PagedServices> => {
    if (tenantContext === null) {
      return EMPTY_PAGE
    }
    return useCases.listServices.execute(tenantContext, { page, pageSize: DEFAULT_PAGE_SIZE })
  }, [tenantContext, useCases, page])

  const { data, status, error, execute } = useAsync(listServices)

  const createService = useCallback(
    async (input: CreateServiceInput): Promise<Service> => {
      if (tenantContext === null) {
        throw new Error('Não é possível criar um serviço sem um contexto de tenant autenticado')
      }
      const service = await useCases.createService.execute(tenantContext, input)
      await execute()
      return service
    },
    [tenantContext, useCases, execute],
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
      await execute()
    },
    [tenantContext, useCases, execute],
  )

  return {
    services: data?.services ?? [],
    status,
    error,
    page,
    pageSize: data?.pageSize ?? DEFAULT_PAGE_SIZE,
    totalCount: data?.totalCount ?? 0,
    setPage,
    refetch: execute,
    createService,
    updateService,
    deleteService,
  }
}
