import type { Service } from '../../../domain/entities/Service'
import type { CreateServiceInput, ServiceRepository } from '../../repositories/ServiceRepository'
import type { TenantContext } from '../../context/TenantContext'

export class CreateService {
  private readonly serviceRepository: ServiceRepository

  constructor(serviceRepository: ServiceRepository) {
    this.serviceRepository = serviceRepository
  }

  execute(tenantContext: TenantContext, input: CreateServiceInput): Promise<Service> {
    return this.serviceRepository.create(tenantContext, input)
  }
}
