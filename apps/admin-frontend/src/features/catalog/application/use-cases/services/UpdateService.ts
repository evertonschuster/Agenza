import type { Service } from '@/features/catalog/domain/entities/Service'
import type {
  ServiceRepository,
  UpdateServiceInput,
} from '@/features/catalog/application/repositories/ServiceRepository'
import type { TenantContext } from '@/features/auth'

export class UpdateService {
  private readonly serviceRepository: ServiceRepository

  constructor(serviceRepository: ServiceRepository) {
    this.serviceRepository = serviceRepository
  }

  execute(tenantContext: TenantContext, id: string, input: UpdateServiceInput): Promise<Service> {
    return this.serviceRepository.update(tenantContext, id, input)
  }
}
