import type { Service } from '../../../domain/entities/Service'
import type { ServiceRepository, UpdateServiceInput } from '../../repositories/ServiceRepository'
import type { TenantContext } from '../../context/TenantContext'

export class UpdateService {
  private readonly serviceRepository: ServiceRepository

  constructor(serviceRepository: ServiceRepository) {
    this.serviceRepository = serviceRepository
  }

  execute(tenantContext: TenantContext, id: string, input: UpdateServiceInput): Promise<Service> {
    return this.serviceRepository.update(tenantContext, id, input)
  }
}
