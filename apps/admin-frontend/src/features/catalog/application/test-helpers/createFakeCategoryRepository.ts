import type { CategoryRepository } from '@/features/catalog/application/repositories/CategoryRepository'
import { AppError } from '@/shared/application/AppError'
import { failure, success } from '@/shared/application/Result'

const NOT_IMPLEMENTED = new AppError({
  code: 'unexpected',
  message: 'not implemented in this fake',
  retryable: false,
})

export function createFakeCategoryRepository(
  overrides: Partial<CategoryRepository> = {},
): CategoryRepository {
  return {
    listAll: () => Promise.resolve(success([])),
    getById: () => Promise.resolve(failure(NOT_IMPLEMENTED)),
    create: () => Promise.resolve(failure(NOT_IMPLEMENTED)),
    update: () => Promise.resolve(failure(NOT_IMPLEMENTED)),
    delete: () => Promise.resolve(success(undefined)),
    ...overrides,
  }
}
