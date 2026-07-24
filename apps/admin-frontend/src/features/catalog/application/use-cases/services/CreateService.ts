import type { Service } from '@/features/catalog/domain/entities/Service'
import type {
  CreateServiceInput,
  ServiceRepository,
} from '@/features/catalog/application/repositories/ServiceRepository'
import type { TenantContext } from '@/features/auth'

export class CreateService {
  private readonly serviceRepository: ServiceRepository

  constructor(serviceRepository: ServiceRepository) {
    this.serviceRepository = serviceRepository
  }

  execute(tenantContext: TenantContext, input: CreateServiceInput): Promise<Service> {
    return this.serviceRepository.create(tenantContext, input)
  }
}
