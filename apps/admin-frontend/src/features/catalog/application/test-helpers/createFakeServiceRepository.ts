import type { ServiceRepository } from '@/features/catalog/application/repositories/ServiceRepository'

/**
 * Fake ServiceRepository for use case unit tests (repo convention:
 * hand-written fakes, not a mocking library). Defaults to empty/no-op
 * behavior; pass overrides to control what a specific test needs to verify.
 */
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
