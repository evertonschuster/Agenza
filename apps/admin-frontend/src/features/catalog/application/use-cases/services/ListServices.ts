import type {
  ListAllServicesOptions,
  PagedServices,
  ServiceRepository,
} from '@/features/catalog/application/repositories/ServiceRepository'
import type { TenantContext } from '@/features/auth'

export class ListServices {
  private readonly serviceRepository: ServiceRepository

  constructor(serviceRepository: ServiceRepository) {
    this.serviceRepository = serviceRepository
  }

  execute(tenantContext: TenantContext, options?: ListAllServicesOptions): Promise<PagedServices> {
    return this.serviceRepository.listAll(tenantContext, options)
  }
}
