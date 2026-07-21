import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor, act, type RenderHookResult } from '@testing-library/react'
import { useTags, type UseTagsResult } from './useTags'
import { AppContainerContext } from '../providers/AppContainerContext'
import type { AppContainer } from '../../composition/container'
import { Tag } from '../../domain/entities/Tag'
import { Tenant } from '../../domain/value-objects/Tenant'
import { User } from '../../domain/entities/User'
import type { TenantContext } from '../../application/context/TenantContext'

const tagFixture = Tag.create({ id: 'tag-1', name: 'VIP', color: '#0d9488' })

interface FakeUseCases {
  listTags: { execute: () => Promise<Tag[]> }
  createTag: { execute: () => Promise<Tag> }
  updateTag: { execute: () => Promise<Tag> }
  deleteTag: { execute: () => Promise<void> }
}

function createFakeContainer(overrides: Partial<FakeUseCases> = {}): AppContainer {
  return {
    useCases: {
      listTags: { execute: vi.fn(() => Promise.resolve([tagFixture])) },
      createTag: { execute: vi.fn(() => Promise.resolve(tagFixture)) },
      updateTag: { execute: vi.fn(() => Promise.resolve(tagFixture)) },
      deleteTag: { execute: vi.fn(() => Promise.resolve()) },
      ...overrides,
    },
  } as unknown as AppContainer
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
})
