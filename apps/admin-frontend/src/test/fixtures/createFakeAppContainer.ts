import { vi } from 'vitest'
import type { AppContainer, AuthFacade, CatalogFacade } from '@/app/composition/container'
import { createFakeSessionEventBus } from '@/test/fixtures/fakeSessionEventBus'

const NOT_USED_IN_THIS_FAKE = (): Promise<never> =>
  Promise.reject(new Error('not used in this fake'))

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
    listTags: { execute: vi.fn(() => Promise.resolve([])) },
    createTag: { execute: vi.fn(NOT_USED_IN_THIS_FAKE) },
    updateTag: { execute: vi.fn(NOT_USED_IN_THIS_FAKE) },
    deleteTag: { execute: vi.fn(NOT_USED_IN_THIS_FAKE) },
    listCategories: { execute: vi.fn(() => Promise.resolve([])) },
    createCategory: { execute: vi.fn(NOT_USED_IN_THIS_FAKE) },
    updateCategory: { execute: vi.fn(NOT_USED_IN_THIS_FAKE) },
    deleteCategory: { execute: vi.fn(NOT_USED_IN_THIS_FAKE) },
    listServices: {
      execute: vi.fn(() => Promise.resolve({ services: [], totalCount: 0, page: 1, pageSize: 20 })),
    },
    createService: { execute: vi.fn(NOT_USED_IN_THIS_FAKE) },
    updateService: { execute: vi.fn(NOT_USED_IN_THIS_FAKE) },
    deleteService: { execute: vi.fn(NOT_USED_IN_THIS_FAKE) },
  }
}

interface CreateFakeAppContainerOverrides {
  auth?: Partial<AuthFacade>
  catalog?: Partial<CatalogFacade>
}

/**
 * A complete, fully-typed AppContainer fake - no `as unknown as AppContainer`
 * cast needed, since AppContainer's facades are structural (Pick<Class,
 * 'execute'>), not the concrete use-case classes themselves (docs/adr/008).
 * Pass only the facade members a given test cares about; everything else
 * gets a safe default that rejects/resolves-empty if accidentally invoked.
 */
export function createFakeAppContainer(
  overrides: CreateFakeAppContainerOverrides = {},
): AppContainer {
  return {
    auth: { ...defaultAuthFacade(), ...overrides.auth },
    catalog: { ...defaultCatalogFacade(), ...overrides.catalog },
  }
}
