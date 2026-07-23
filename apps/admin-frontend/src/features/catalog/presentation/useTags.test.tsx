import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor, act, type RenderHookResult } from '@testing-library/react'
import { useTags, type UseTagsResult } from '@/features/catalog/presentation/useTags'
import { AppContainerContext } from '@/app/providers/AppContainerContext'
import { createFakeAppContainer } from '@/test/fixtures/createFakeAppContainer'
import type { AppContainer, CatalogFacade } from '@/app/composition/container'
import { Tag } from '@/features/catalog/domain/entities/Tag'
import { Tenant } from '@/features/auth'
import { User } from '@/features/auth'
import type { TenantContext } from '@/features/auth'

const tagFixture = Tag.create({ id: 'tag-1', name: 'VIP', color: '#0d9488' })

function createFakeContainer(overrides: Partial<CatalogFacade> = {}): AppContainer {
  return createFakeAppContainer({
    catalog: {
      listTags: { execute: vi.fn(() => Promise.resolve([tagFixture])) },
      createTag: { execute: vi.fn(() => Promise.resolve(tagFixture)) },
      updateTag: { execute: vi.fn(() => Promise.resolve(tagFixture)) },
      deleteTag: { execute: vi.fn(() => Promise.resolve()) },
      ...overrides,
    },
  })
}

function buildTenantContext(): TenantContext {
  const tenant = Tenant.create('tenant-123')
  return { tenant, user: User.create({ id: 'user-1', tenant }) }
}

function renderUseTags(
  container: AppContainer,
  tenantContext: TenantContext | null,
): RenderHookResult<UseTagsResult, undefined> {
  return renderHook<UseTagsResult, undefined>(() => useTags(tenantContext), {
    wrapper: ({ children }) => (
      <AppContainerContext.Provider value={container}>{children}</AppContainerContext.Provider>
    ),
  })
}

describe('useTags', () => {
  it('loads tags for the given tenant context', async () => {
    const { result } = renderUseTags(createFakeContainer(), buildTenantContext())

    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })

    expect(result.current.tags).toEqual([tagFixture])
  })

  it('returns an empty list without calling the use case when tenantContext is null', async () => {
    const listTagsSpy = vi.fn(() => Promise.resolve([tagFixture]))
    const { result } = renderUseTags(
      createFakeContainer({ listTags: { execute: listTagsSpy } }),
      null,
    )

    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })

    expect(result.current.tags).toEqual([])
    expect(listTagsSpy).not.toHaveBeenCalled()
  })

  it('creates a tag then refetches the list', async () => {
    const listTagsSpy = vi.fn(() => Promise.resolve([tagFixture]))
    const createTagSpy = vi.fn(() => Promise.resolve(tagFixture))
    const tenantContext = buildTenantContext()
    const { result } = renderUseTags(
      createFakeContainer({
        listTags: { execute: listTagsSpy },
        createTag: { execute: createTagSpy },
      }),
      tenantContext,
    )
    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })
    listTagsSpy.mockClear()

    await act(async () => {
      await result.current.createTag({ name: 'VIP', color: '#0d9488' })
    })

    expect(createTagSpy).toHaveBeenCalledExactlyOnceWith(tenantContext, {
      name: 'VIP',
      color: '#0d9488',
    })
    // The refetch fires in the background (not awaited by createTag
    // itself) - wait for it rather than asserting immediately.
    await waitFor(() => {
      expect(listTagsSpy).toHaveBeenCalledTimes(1)
    })
  })

  it('keeps the created tag visible even if the background refetch fails', async () => {
    const newTag = Tag.create({ id: 'tag-2', name: 'Returning', color: '#ef4444' })
    const listTagsSpy = vi
      .fn<() => Promise<Tag[]>>()
      .mockResolvedValueOnce([tagFixture])
      .mockRejectedValueOnce(new Error('network down'))
    const createTagSpy = vi.fn(() => Promise.resolve(newTag))
    const tenantContext = buildTenantContext()
    const { result } = renderUseTags(
      createFakeContainer({
        listTags: { execute: listTagsSpy },
        createTag: { execute: createTagSpy },
      }),
      tenantContext,
    )
    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })

    await act(async () => {
      await expect(
        result.current.createTag({ name: 'Returning', color: '#ef4444' }),
      ).resolves.toEqual(newTag)
    })

    // The optimistic insert survives the refetch failure below.
    expect(result.current.tags).toEqual([tagFixture, newTag])

    await waitFor(() => {
      expect(result.current.status).toBe('error')
    })
    // Still there after the failed refetch settles - not cleared, not
    // reported as a failed creation, so it keeps showing as a chip.
    expect(result.current.tags).toEqual([tagFixture, newTag])
  })

  it('deletes a tag then refetches the list', async () => {
    const listTagsSpy = vi.fn(() => Promise.resolve([tagFixture]))
    const deleteTagSpy = vi.fn(() => Promise.resolve())
    const tenantContext = buildTenantContext()
    const { result } = renderUseTags(
      createFakeContainer({
        listTags: { execute: listTagsSpy },
        deleteTag: { execute: deleteTagSpy },
      }),
      tenantContext,
    )
    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })
    listTagsSpy.mockClear()

    await act(async () => {
      await result.current.deleteTag('tag-1')
    })

    expect(deleteTagSpy).toHaveBeenCalledExactlyOnceWith(tenantContext, 'tag-1')
    expect(listTagsSpy).toHaveBeenCalledTimes(1)
  })

  it('rejects mutations when tenantContext is null', async () => {
    const { result } = renderUseTags(createFakeContainer(), null)
    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })

    await expect(result.current.createTag({ name: 'VIP', color: '#0d9488' })).rejects.toThrow()
  })

  it('does not let a create started against the previous tenant leak into the new tenant after a switch', async () => {
    const tenantA = buildTenantContext()
    const tenantBValue = Tenant.create('tenant-456')
    const tenantB: TenantContext = {
      tenant: tenantBValue,
      user: User.create({ id: 'user-1', tenant: tenantBValue }),
    }

    let resolveCreate: ((tag: Tag) => void) | undefined
    const createTagSpy = vi.fn(
      () =>
        new Promise<Tag>(resolve => {
          resolveCreate = resolve
        }),
    )
    const listTagsSpy = vi
      .fn<() => Promise<Tag[]>>()
      .mockResolvedValueOnce([tagFixture]) // tenant A's initial load
      .mockResolvedValueOnce([]) // tenant B's auto-fetch right after the switch
      .mockResolvedValue([tagFixture]) // any further stale tenant-A refetch

    const container = createFakeContainer({
      listTags: { execute: listTagsSpy },
      createTag: { execute: createTagSpy },
    })

    const { result, rerender } = renderHook<UseTagsResult, { tenantContext: TenantContext | null }>(
      ({ tenantContext }) => useTags(tenantContext),
      {
        wrapper: ({ children }) => (
          <AppContainerContext.Provider value={container}>{children}</AppContainerContext.Provider>
        ),
        initialProps: { tenantContext: tenantA },
      },
    )

    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })
    expect(result.current.tags).toEqual([tagFixture])

    // Start a create against tenant A - deliberately left pending.
    let createPromise: Promise<Tag> | undefined
    act(() => {
      createPromise = result.current.createTag({ name: 'VIP', color: '#0d9488' })
    })

    // Switch to tenant B before the create resolves.
    rerender({ tenantContext: tenantB })
    await waitFor(() => {
      expect(result.current.tags).toEqual([])
    })

    // Tenant A's create finally resolves. The extra microtask flushes give
    // its background `void execute()` (fired after mutate, not awaited by
    // createTag itself) a chance to settle before the assertion below, so
    // this test would actually fail if the tenant-switch guard regressed.
    await act(async () => {
      resolveCreate?.(tagFixture)
      await createPromise
      await Promise.resolve()
      await Promise.resolve()
    })

    // Tenant B's list must still be empty - the stale create's optimistic
    // insert and its own background refetch must not have applied.
    expect(result.current.tags).toEqual([])
  })
})
