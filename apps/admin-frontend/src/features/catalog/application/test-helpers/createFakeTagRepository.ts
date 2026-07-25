import type { TagRepository } from '@/features/catalog/application/repositories/TagRepository'

export function createFakeTagRepository(overrides: Partial<TagRepository> = {}): TagRepository {
  return {
    listAll: () => Promise.resolve([]),
    create: () => Promise.reject(new Error('not implemented in this fake')),
    update: () => Promise.reject(new Error('not implemented in this fake')),
    delete: () => Promise.resolve(),
    ...overrides,
  }
}
