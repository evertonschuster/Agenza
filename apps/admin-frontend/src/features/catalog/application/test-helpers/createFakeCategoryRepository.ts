import type { CategoryRepository } from '@/features/catalog/application/repositories/CategoryRepository'

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
