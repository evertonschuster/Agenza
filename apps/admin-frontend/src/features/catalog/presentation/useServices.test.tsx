import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor, act, type RenderHookResult } from '@testing-library/react'
import { useServices, type UseServicesResult } from '@/features/catalog/presentation/useServices'
import { AppContainerContext } from '@/app/providers/AppContainerContext'
import { createFakeAppContainer } from '@/test/fixtures/createFakeAppContainer'
import type { AppContainer, CatalogFacade } from '@/app/composition/container'
import { Service } from '@/features/catalog/domain/entities/Service'
import { Tenant } from '@/features/auth'
import { User } from '@/features/auth'
import type { TenantContext } from '@/features/auth'
import type { CreateServiceInput } from '@/features/catalog/application/repositories/ServiceRepository'

const serviceFixture = Service.create({
  id: 'service-1',
  code: 1001,
  name: 'Massagem relaxante',
  durationMinutes: 60,
  minDurationMinutes: 30,
  maxDurationMinutes: 90,
  price: 150,
  maxDiscountPercentage: 10,
  tags: [],
})

const createInput: CreateServiceInput = {
  name: 'Massagem relaxante',
  durationMinutes: 60,
  minDurationMinutes: 30,
  maxDurationMinutes: 90,
  price: 150,
  maxDiscountPercentage: 10,
}

const pagedFixture = { services: [serviceFixture], totalCount: 1, page: 1, pageSize: 20 }

function createFakeContainer(overrides: Partial<CatalogFacade> = {}): AppContainer {
  return createFakeAppContainer({
    catalog: {
      listServices: { execute: vi.fn(() => Promise.resolve(pagedFixture)) },
      createService: { execute: vi.fn(() => Promise.resolve(serviceFixture)) },
      updateService: { execute: vi.fn(() => Promise.resolve(serviceFixture)) },
      deleteService: { execute: vi.fn(() => Promise.resolve()) },
      ...overrides,
    },
  })
}

function buildTenantContext(): TenantContext {
  const tenant = Tenant.create('tenant-123')
  return { tenant, user: User.create({ id: 'user-1', tenant }) }
}

function renderUseServices(
  container: AppContainer,
  tenantContext: TenantContext | null,
): RenderHookResult<UseServicesResult, undefined> {
  return renderHook<UseServicesResult, undefined>(() => useServices(tenantContext), {
    wrapper: ({ children }) => (
      <AppContainerContext.Provider value={container}>{children}</AppContainerContext.Provider>
    ),
  })
}

describe('useServices', () => {
  it('loads services for the given tenant context', async () => {
    const { result } = renderUseServices(createFakeContainer(), buildTenantContext())

    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })

    expect(result.current.services).toEqual([serviceFixture])
  })

  it('returns an empty list without calling the use case when tenantContext is null', async () => {
    const listServicesSpy = vi.fn(() => Promise.resolve(pagedFixture))
    const { result } = renderUseServices(
      createFakeContainer({ listServices: { execute: listServicesSpy } }),
      null,
    )

    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })

    expect(result.current.services).toEqual([])
    expect(listServicesSpy).not.toHaveBeenCalled()
  })

  it('creates a service then refetches the list', async () => {
    const listServicesSpy = vi.fn(() => Promise.resolve(pagedFixture))
    const createServiceSpy = vi.fn(() => Promise.resolve(serviceFixture))
    const tenantContext = buildTenantContext()
    const { result } = renderUseServices(
      createFakeContainer({
        listServices: { execute: listServicesSpy },
        createService: { execute: createServiceSpy },
      }),
      tenantContext,
    )
    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })
    listServicesSpy.mockClear()

    await act(async () => {
      await result.current.createService(createInput)
    })

    expect(createServiceSpy).toHaveBeenCalledExactlyOnceWith(tenantContext, createInput)
    // The refetch fires in the background (not awaited by createService
    // itself) - wait for it rather than asserting immediately.
    await waitFor(() => {
      expect(listServicesSpy).toHaveBeenCalledTimes(1)
    })
  })

  it('keeps the created service visible even if the background refetch fails', async () => {
    const newService = Service.create({
      id: 'service-2',
      code: 1002,
      name: 'Novo serviço',
      durationMinutes: 45,
      minDurationMinutes: 30,
      maxDurationMinutes: 60,
      price: 90,
      maxDiscountPercentage: 5,
      tags: [],
    })
    const listServicesSpy = vi
      .fn<() => Promise<typeof pagedFixture>>()
      .mockResolvedValueOnce(pagedFixture)
      .mockRejectedValueOnce(new Error('network down'))
    const createServiceSpy = vi.fn(() => Promise.resolve(newService))
    const tenantContext = buildTenantContext()
    const { result } = renderUseServices(
      createFakeContainer({
        listServices: { execute: listServicesSpy },
        createService: { execute: createServiceSpy },
      }),
      tenantContext,
    )
    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })

    await act(async () => {
      await expect(result.current.createService(createInput)).resolves.toEqual(newService)
    })

    // The optimistic insert survives the refetch failure below.
    expect(result.current.services).toEqual([serviceFixture, newService])
    expect(result.current.totalCount).toBe(2)

    await waitFor(() => {
      expect(result.current.status).toBe('error')
    })
    // Still there after the failed refetch settles - not cleared, not
    // reported as a failed creation.
    expect(result.current.services).toEqual([serviceFixture, newService])
  })

  it('deletes a service then refetches the list', async () => {
    const listServicesSpy = vi.fn(() => Promise.resolve(pagedFixture))
    const deleteServiceSpy = vi.fn(() => Promise.resolve())
    const tenantContext = buildTenantContext()
    const { result } = renderUseServices(
      createFakeContainer({
        listServices: { execute: listServicesSpy },
        deleteService: { execute: deleteServiceSpy },
      }),
      tenantContext,
    )
    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })
    listServicesSpy.mockClear()

    await act(async () => {
      await result.current.deleteService('service-1')
    })

    expect(deleteServiceSpy).toHaveBeenCalledExactlyOnceWith(tenantContext, 'service-1')
    expect(listServicesSpy).toHaveBeenCalledTimes(1)
  })

  it('rejects mutations when tenantContext is null', async () => {
    const { result } = renderUseServices(createFakeContainer(), null)
    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })

    await expect(result.current.createService(createInput)).rejects.toThrow()
  })

  it('exposes the paged metadata from the use case result', async () => {
    const { result } = renderUseServices(
      createFakeContainer({
        listServices: {
          execute: vi.fn(() =>
            Promise.resolve({ services: [serviceFixture], totalCount: 42, page: 1, pageSize: 20 }),
          ),
        },
      }),
      buildTenantContext(),
    )

    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })

    expect(result.current.totalCount).toBe(42)
    expect(result.current.page).toBe(1)
    expect(result.current.pageSize).toBe(20)
  })

  it('steps back a page after deleting the last item on a page past the first', async () => {
    const tenantContext = buildTenantContext()
    const listServicesSpy = vi
      .fn()
      // Initial load of page 1 (called by setPage(2) below via a fresh fetch)
      .mockResolvedValueOnce({ services: [serviceFixture], totalCount: 21, page: 1, pageSize: 20 })
      // After setPage(2): one item on page 2
      .mockResolvedValueOnce({ services: [serviceFixture], totalCount: 21, page: 2, pageSize: 20 })
      // After deleting it: page 2 is now empty
      .mockResolvedValueOnce({ services: [], totalCount: 20, page: 2, pageSize: 20 })
      // After stepping back to page 1: has data again
      .mockResolvedValueOnce({ services: [serviceFixture], totalCount: 20, page: 1, pageSize: 20 })
    const deleteServiceSpy = vi.fn(() => Promise.resolve())
    const { result } = renderUseServices(
      createFakeContainer({
        listServices: { execute: listServicesSpy },
        deleteService: { execute: deleteServiceSpy },
      }),
      tenantContext,
    )
    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })

    act(() => {
      result.current.setPage(2)
    })
    await waitFor(() => {
      expect(result.current.page).toBe(2)
    })

    await act(async () => {
      await result.current.deleteService('service-1')
    })

    await waitFor(() => {
      expect(result.current.page).toBe(1)
    })
  })

  it('refetches with the new page when setPage is called', async () => {
    const listServicesSpy = vi.fn(() => Promise.resolve(pagedFixture))
    const tenantContext = buildTenantContext()
    const { result } = renderUseServices(
      createFakeContainer({ listServices: { execute: listServicesSpy } }),
      tenantContext,
    )
    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })
    listServicesSpy.mockClear()

    act(() => {
      result.current.setPage(2)
    })

    await waitFor(() => {
      expect(result.current.page).toBe(2)
    })
    expect(listServicesSpy).toHaveBeenCalledWith(tenantContext, { page: 2, pageSize: 20 })
  })
})
