import type { ServiceRepository } from '@/features/catalog/application/repositories/ServiceRepository'
import type { TenantContext } from '@/features/auth'

export class DeleteService {
  private readonly serviceRepository: ServiceRepository

  constructor(serviceRepository: ServiceRepository) {
    this.serviceRepository = serviceRepository
  }

  execute(tenantContext: TenantContext, id: string): Promise<void> {
    return this.serviceRepository.delete(tenantContext, id)
  }
}
