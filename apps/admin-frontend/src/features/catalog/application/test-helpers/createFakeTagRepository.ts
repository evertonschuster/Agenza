import type { TagRepository } from '@/features/catalog/application/repositories/TagRepository'
import { AppError } from '@/shared/application/AppError'
import { failure, success } from '@/shared/application/Result'

const NOT_IMPLEMENTED = new AppError({
  code: 'unexpected',
  message: 'not implemented in this fake',
  retryable: false,
})

export function createFakeTagRepository(overrides: Partial<TagRepository> = {}): TagRepository {
  return {
    listAll: () => Promise.resolve(success([])),
    create: () => Promise.resolve(failure(NOT_IMPLEMENTED)),
    update: () => Promise.resolve(failure(NOT_IMPLEMENTED)),
    delete: () => Promise.resolve(success(undefined)),
    ...overrides,
  }
}
