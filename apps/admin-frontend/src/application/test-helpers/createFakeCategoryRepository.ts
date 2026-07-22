import type { CategoryRepository } from '../repositories/CategoryRepository'

/**
 * Fake CategoryRepository for use case unit tests (repo convention:
 * hand-written fakes, not a mocking library). Defaults to empty/no-op
 * behavior; pass overrides to control what a specific test needs to verify.
 */
export function createFakeCategoryRepository(
  overrides: Partial<CategoryRepository> = {},
): CategoryRepository {
  return {
    listAll: () => Promise.resolve([]),
    create: () => Promise.reject(new Error('not implemented in this fake')),
    update: () => Promise.reject(new Error('not implemented in this fake')),
    delete: () => Promise.resolve(),
    ...overrides,
  }
}
