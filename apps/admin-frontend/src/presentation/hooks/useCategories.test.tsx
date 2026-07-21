import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor, act, type RenderHookResult } from '@testing-library/react'
import { useCategories, type UseCategoriesResult } from './useCategories'
import { AppContainerContext } from '../providers/AppContainerContext'
import type { AppContainer } from '../../composition/container'
import { Category } from '../../domain/entities/Category'
import { Tenant } from '../../domain/value-objects/Tenant'
import { User } from '../../domain/entities/User'
import type { TenantContext } from '../../application/context/TenantContext'

const categoryFixture = Category.create({ id: 'category-1', name: 'Massagens' })

interface FakeUseCases {
  listCategories: { execute: () => Promise<Category[]> }
  createCategory: { execute: () => Promise<Category> }
  updateCategory: { execute: () => Promise<Category> }
  deleteCategory: { execute: () => Promise<void> }
}

function createFakeContainer(overrides: Partial<FakeUseCases> = {}): AppContainer {
  return {
    useCases: {
      listCategories: { execute: vi.fn(() => Promise.resolve([categoryFixture])) },
      createCategory: { execute: vi.fn(() => Promise.resolve(categoryFixture)) },
      updateCategory: { execute: vi.fn(() => Promise.resolve(categoryFixture)) },
      deleteCategory: { execute: vi.fn(() => Promise.resolve()) },
      ...overrides,
    },
  } as unknown as AppContainer
}

function buildTenantContext(): TenantContext {
  const tenant = Tenant.create('tenant-123')
  return { tenant, user: User.create({ id: 'user-1', tenant }) }
}

function renderUseCategories(
  container: AppContainer,
  tenantContext: TenantContext | null,
): RenderHookResult<UseCategoriesResult, undefined> {
  return renderHook<UseCategoriesResult, undefined>(() => useCategories(tenantContext), {
    wrapper: ({ children }) => (
      <AppContainerContext.Provider value={container}>{children}</AppContainerContext.Provider>
    ),
  })
}

describe('useCategories', () => {
  it('loads categories for the given tenant context', async () => {
    const { result } = renderUseCategories(createFakeContainer(), buildTenantContext())

    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })

    expect(result.current.categories).toEqual([categoryFixture])
  })

  it('returns an empty list without calling the use case when tenantContext is null', async () => {
    const listCategoriesSpy = vi.fn(() => Promise.resolve([categoryFixture]))
    const { result } = renderUseCategories(
      createFakeContainer({ listCategories: { execute: listCategoriesSpy } }),
      null,
    )

    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })

    expect(result.current.categories).toEqual([])
    expect(listCategoriesSpy).not.toHaveBeenCalled()
  })

  it('creates a category then refetches the list', async () => {
    const listCategoriesSpy = vi.fn(() => Promise.resolve([categoryFixture]))
    const createCategorySpy = vi.fn(() => Promise.resolve(categoryFixture))
    const tenantContext = buildTenantContext()
    const { result } = renderUseCategories(
      createFakeContainer({
        listCategories: { execute: listCategoriesSpy },
        createCategory: { execute: createCategorySpy },
      }),
      tenantContext,
    )
    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })
    listCategoriesSpy.mockClear()

    await act(async () => {
      await result.current.createCategory({ name: 'Massagens' })
    })

    expect(createCategorySpy).toHaveBeenCalledExactlyOnceWith(tenantContext, {
      name: 'Massagens',
    })
    // The refetch fires in the background (not awaited by createCategory
    // itself) - wait for it rather than asserting immediately.
    await waitFor(() => {
      expect(listCategoriesSpy).toHaveBeenCalledTimes(1)
    })
  })

  it('resolves as soon as the POST succeeds, without waiting for the background refetch', async () => {
    let resolveRefetch: (() => void) | undefined
    const listCategoriesSpy = vi
      .fn<() => Promise<Category[]>>()
      .mockResolvedValueOnce([categoryFixture])
      .mockImplementationOnce(
        () =>
          new Promise<Category[]>(resolve => {
            resolveRefetch = () => {
              resolve([categoryFixture])
            }
          }),
      )
    const tenantContext = buildTenantContext()
    const { result } = renderUseCategories(
      createFakeContainer({ listCategories: { execute: listCategoriesSpy } }),
      tenantContext,
    )
    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })

    // createCategory resolves even though the refetch it triggers never
    // settles during this act() block - proving success doesn't depend on
    // the background refetch completing.
    await act(async () => {
      await result.current.createCategory({ name: 'Nova categoria' })
    })

    expect(result.current.categories).toContainEqual(categoryFixture)

    await act(async () => {
      resolveRefetch?.()
      await Promise.resolve()
    })
  })

  it('keeps the created category visible even if the background refetch fails', async () => {
    const newCategory = Category.create({ id: 'category-2', name: 'Nova categoria' })
    const listCategoriesSpy = vi
      .fn<() => Promise<Category[]>>()
      .mockResolvedValueOnce([categoryFixture])
      .mockRejectedValueOnce(new Error('network down'))
    const createCategorySpy = vi.fn(() => Promise.resolve(newCategory))
    const tenantContext = buildTenantContext()
    const { result } = renderUseCategories(
      createFakeContainer({
        listCategories: { execute: listCategoriesSpy },
        createCategory: { execute: createCategorySpy },
      }),
      tenantContext,
    )
    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })

    await act(async () => {
      await expect(result.current.createCategory({ name: 'Nova categoria' })).resolves.toEqual(
        newCategory,
      )
    })

    // The optimistic insert survives the refetch failure below.
    expect(result.current.categories).toEqual([categoryFixture, newCategory])

    await waitFor(() => {
      expect(result.current.status).toBe('error')
    })
    // Still there after the failed refetch settles - not cleared, not
    // reported as a failed creation.
    expect(result.current.categories).toEqual([categoryFixture, newCategory])
  })

  it('deletes a category then refetches the list', async () => {
    const listCategoriesSpy = vi.fn(() => Promise.resolve([categoryFixture]))
    const deleteCategorySpy = vi.fn(() => Promise.resolve())
    const tenantContext = buildTenantContext()
    const { result } = renderUseCategories(
      createFakeContainer({
        listCategories: { execute: listCategoriesSpy },
        deleteCategory: { execute: deleteCategorySpy },
      }),
      tenantContext,
    )
    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })
    listCategoriesSpy.mockClear()

    await act(async () => {
      await result.current.deleteCategory('category-1')
    })

    expect(deleteCategorySpy).toHaveBeenCalledExactlyOnceWith(tenantContext, 'category-1')
    expect(listCategoriesSpy).toHaveBeenCalledTimes(1)
  })

  it('rejects mutations when tenantContext is null', async () => {
    const { result } = renderUseCategories(createFakeContainer(), null)
    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })

    await expect(result.current.createCategory({ name: 'Massagens' })).rejects.toThrow()
  })
})
