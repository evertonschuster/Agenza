import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useCallback } from 'react'
import { useAsync } from './useAsync'

describe('useAsync', () => {
  it('starts in a loading state and resolves to data on success', async () => {
    const asyncFn = vi.fn(() => Promise.resolve('result'))

    const { result } = renderHook(() => useAsync(asyncFn))

    expect(result.current.status).toBe('loading')

    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })

    expect(result.current.data).toBe('result')
  })

  it('resolves to an error state when the async function rejects', async () => {
    const asyncFn = vi.fn(() => Promise.reject(new Error('boom')))

    const { result } = renderHook(() => useAsync(asyncFn))

    await waitFor(() => {
      expect(result.current.status).toBe('error')
    })

    expect(result.current.error).toBeInstanceOf(Error)
    expect((result.current.error as Error).message).toBe('boom')
  })

  it('re-runs the async function when execute is called again', async () => {
    const asyncFn = vi.fn(() => Promise.resolve('result'))

    const { result } = renderHook(() => useAsync(asyncFn))

    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })

    expect(asyncFn).toHaveBeenCalledTimes(1)

    await act(async () => {
      await result.current.execute()
    })

    expect(asyncFn).toHaveBeenCalledTimes(2)
  })

  it('does not auto-run when immediate is false, only on explicit execute', async () => {
    const asyncFn = vi.fn(() => Promise.resolve('result'))

    const { result } = renderHook(() => useAsync(asyncFn, { immediate: false }))

    expect(result.current.status).toBe('idle')
    expect(asyncFn).not.toHaveBeenCalled()

    await act(async () => {
      await result.current.execute()
    })

    expect(result.current.status).toBe('success')
  })

  it('ignores an older execute() call that resolves after a newer one', async () => {
    // Simulates a fast filter/page/tenant change: the first request is slow
    // (e.g. "massa"), a second one fires before it resolves (e.g. "corte"),
    // and the second one resolves first. The stale first response must not
    // overwrite the newer one.
    let resolveFirst: ((value: string) => void) | undefined
    let resolveSecond: ((value: string) => void) | undefined
    const asyncFn = vi
      .fn<() => Promise<string>>()
      .mockImplementationOnce(() => new Promise<string>(resolve => (resolveFirst = resolve)))
      .mockImplementationOnce(() => new Promise<string>(resolve => (resolveSecond = resolve)))

    const { result } = renderHook(() => useAsync(asyncFn, { immediate: false }))

    let firstCall: Promise<string | undefined>
    let secondCall: Promise<string | undefined>
    act(() => {
      firstCall = result.current.execute()
    })
    act(() => {
      secondCall = result.current.execute()
    })

    // The newer request resolves first...
    await act(async () => {
      resolveSecond?.('newer')
      await secondCall
    })
    expect(result.current.status).toBe('success')
    expect(result.current.data).toBe('newer')

    // ...then the stale older request resolves - it must be ignored, not
    // overwrite the already-applied newer result.
    await act(async () => {
      resolveFirst?.('stale')
      await firstCall
    })
    expect(result.current.status).toBe('success')
    expect(result.current.data).toBe('newer')
  })

  it('clears data immediately on a tenant switch and ignores a stale response for the old tenant', async () => {
    // 1. Tenant A's list is loaded (its fetch resolves normally).
    // 2. Switch to tenant B - its fetch is deliberately left pending.
    // 3. No tenant-A rows remain visible during that window.
    // 4. A stale, late-resolving response for tenant A must be ignored.
    let resolveB: ((value: string[]) => void) | undefined
    // A fresh closure per tenantId, like a real listCategories useCallback
    // whose deps include tenantContext - resetKey and asyncFn identity
    // change together on a real tenant switch.
    const fetchForTenant = vi.fn((tenantId: string) =>
      tenantId === 'tenant-a'
        ? Promise.resolve(['a-row-1', 'a-row-2'])
        : new Promise<string[]>(resolve => (resolveB = resolve)),
    )

    const { result, rerender } = renderHook(
      ({ tenantId }: { tenantId: string }) => {
        // useCallback keyed on tenantId, exactly like a real listCategories
        // hook - without this, a fresh asyncFn on every render (including
        // ones execute() itself triggers) re-fires the mount effect forever.
        const asyncFn = useCallback(() => fetchForTenant(tenantId), [tenantId])
        return useAsync(asyncFn, { resetKey: tenantId })
      },
      { initialProps: { tenantId: 'tenant-a' } },
    )

    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })
    expect(result.current.data).toEqual(['a-row-1', 'a-row-2'])

    // Switch to tenant B. A second call to asyncFn starts (mocked to stay
    // pending), and the resetKey change must clear tenant A's rows
    // synchronously - before tenant B's fetch has resolved at all.
    rerender({ tenantId: 'tenant-b' })

    expect(result.current.data).toBeNull()
    expect(result.current.status).toBe('loading')

    // Tenant B's fetch resolves - this is the real, current data.
    await waitFor(() => {
      expect(resolveB).toBeDefined()
    })
    act(() => {
      resolveB?.(['b-row-1'])
    })
    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })
    expect(result.current.data).toEqual(['b-row-1'])
  })

  it('ignores a stale execute() left over from before a resetKey change', async () => {
    let resolveStale: ((value: string) => void) | undefined
    let resolveCurrent: ((value: string) => void) | undefined
    const fetchForTenant = vi.fn((tenantId: string) =>
      tenantId === 'tenant-a'
        ? new Promise<string>(resolve => (resolveStale = resolve))
        : new Promise<string>(resolve => (resolveCurrent = resolve)),
    )

    const { result, rerender } = renderHook(
      ({ tenantId }: { tenantId: string }) => {
        const asyncFn = useCallback(() => fetchForTenant(tenantId), [tenantId])
        return useAsync(asyncFn, { resetKey: tenantId })
      },
      { initialProps: { tenantId: 'tenant-a' } },
    )

    // Tenant A's fetch is still in flight (never resolved) when the switch
    // to tenant B happens - this is the request whose late resolution must
    // be ignored.
    rerender({ tenantId: 'tenant-b' })
    expect(result.current.data).toBeNull()

    await act(async () => {
      resolveCurrent?.('tenant-b-rows')
      await Promise.resolve()
    })
    expect(result.current.data).toBe('tenant-b-rows')

    // The stale tenant-A request finally resolves - must not overwrite
    // tenant B's already-applied result.
    await act(async () => {
      resolveStale?.('stale-tenant-a-rows')
      await Promise.resolve()
    })
    expect(result.current.data).toBe('tenant-b-rows')
  })
})
