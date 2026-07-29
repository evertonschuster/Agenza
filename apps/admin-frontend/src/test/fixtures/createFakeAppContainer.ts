import { vi } from 'vitest'
import type { AppContainer, AuthFacade, CatalogFacade } from '@/app/composition/container'
import { createFakeSessionEventBus } from '@/test/fixtures/fakeSessionEventBus'
import { AppError } from '@/shared/application/AppError'
import { failure, success, type Result } from '@/shared/application/Result'

const NOT_USED_IN_THIS_FAKE = (): Promise<never> =>
  Promise.reject(new Error('not used in this fake'))

// catalog execute() never rejects (it returns Result), so its "should not be
// called" default must resolve to a failure - a raw rejection here would
// surface as an unhandled promise rejection instead of a normal error state.
const CATALOG_NOT_USED_ERROR = new AppError({
  code: 'unexpected',
  message: 'not used in this fake',
  retryable: false,
})
const CATALOG_NOT_USED_IN_THIS_FAKE = (): Promise<Result<never, AppError>> =>
  Promise.resolve(failure(CATALOG_NOT_USED_ERROR))

function defaultAuthFacade(): AuthFacade {
  return {
    initiateLogin: { execute: vi.fn(() => Promise.resolve()) },
    handleAuthCallback: { execute: vi.fn(NOT_USED_IN_THIS_FAKE) },
    getCurrentSession: { execute: vi.fn(() => Promise.resolve(null)) },
    logout: { execute: vi.fn(() => Promise.resolve()) },
    sessionEvents: createFakeSessionEventBus(),
  }
}

function defaultCatalogFacade(): CatalogFacade {
  return {
    listTags: { execute: vi.fn(() => Promise.resolve(success([]))) },
    createTag: { execute: vi.fn(CATALOG_NOT_USED_IN_THIS_FAKE) },
    updateTag: { execute: vi.fn(CATALOG_NOT_USED_IN_THIS_FAKE) },
    deleteTag: { execute: vi.fn(CATALOG_NOT_USED_IN_THIS_FAKE) },
    listCategories: { execute: vi.fn(() => Promise.resolve(success([]))) },
    createCategory: { execute: vi.fn(CATALOG_NOT_USED_IN_THIS_FAKE) },
    updateCategory: { execute: vi.fn(CATALOG_NOT_USED_IN_THIS_FAKE) },
    deleteCategory: { execute: vi.fn(CATALOG_NOT_USED_IN_THIS_FAKE) },
  }
}

interface CreateFakeAppContainerOverrides {
  auth?: Partial<AuthFacade>
  catalog?: Partial<CatalogFacade>
}

// Fully-typed, no `as unknown as AppContainer` cast needed (docs/adr/008).
// Pass only the members a test cares about; the rest default to a safe
// reject/resolve-empty if accidentally invoked.
export function createFakeAppContainer(
  overrides: CreateFakeAppContainerOverrides = {},
): AppContainer {
  return {
    auth: { ...defaultAuthFacade(), ...overrides.auth },
    catalog: { ...defaultCatalogFacade(), ...overrides.catalog },
  }
}
