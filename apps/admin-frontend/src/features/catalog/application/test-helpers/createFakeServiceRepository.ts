import type { ServiceRepository } from '@/features/catalog/application/repositories/ServiceRepository'

export function createFakeServiceRepository(
  overrides: Partial<ServiceRepository> = {},
): ServiceRepository {
  return {
    listAll: () => Promise.resolve({ services: [], totalCount: 0, page: 1, pageSize: 20 }),
    create: () => Promise.reject(new Error('not implemented in this fake')),
    update: () => Promise.reject(new Error('not implemented in this fake')),
    delete: () => Promise.resolve(),
    ...overrides,
  }
}
