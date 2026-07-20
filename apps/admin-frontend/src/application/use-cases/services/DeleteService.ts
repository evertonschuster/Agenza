import type { ServiceRepository } from '../../repositories/ServiceRepository'
import type { TenantContext } from '../../context/TenantContext'

export class DeleteService {
  private readonly serviceRepository: ServiceRepository

  constructor(serviceRepository: ServiceRepository) {
    this.serviceRepository = serviceRepository
  }

  execute(tenantContext: TenantContext, id: string): Promise<void> {
    return this.serviceRepository.delete(tenantContext, id)
  }
}
