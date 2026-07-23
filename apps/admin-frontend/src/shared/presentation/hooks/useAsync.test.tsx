import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useCallback } from 'react'
import { useAsync, toUiAsyncState, type AsyncState } from '@/shared/presentation/hooks/useAsync'
import { AppError } from '@/shared/application/AppError'

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

  it('resolves to an initialError state (no data yet) when the async function rejects', async () => {
    const asyncFn = vi.fn(() => Promise.reject(new Error('boom')))

    const { result } = renderHook(() => useAsync(asyncFn))

    await waitFor(() => {
      expect(result.current.status).toBe('initialError')
    })

    expect(result.current.data).toBeNull()
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

  it('ignores a manually-triggered execute() call started before a resetKey change, even with no newer call racing it', async () => {
    // Simulates useTags' createTag: it captures `execute` from its own
    // render (tenant A), awaits a POST, and only calls execute() in the
    // background afterward - by which point the app may have already
    // switched to tenant B. No newer execute() call happens to race it in
    // this scenario, so only the resetKey check (not requestId ordering)
    // can catch it.
    const fetchForTenant = vi.fn((tenantId: string) =>
      tenantId === 'tenant-a'
        ? Promise.resolve('a-initial')
        : // eslint-disable-next-line @typescript-eslint/no-empty-function
          new Promise<string>(() => {}),
    )

    const { result, rerender } = renderHook(
      ({ tenantId }: { tenantId: string }) => {
        const asyncFn = useCallback(() => fetchForTenant(tenantId), [tenantId])
        return useAsync(asyncFn, { resetKey: tenantId })
      },
      { initialProps: { tenantId: 'tenant-a' } },
    )

    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })
    expect(result.current.data).toBe('a-initial')

    const staleExecute = result.current.execute

    rerender({ tenantId: 'tenant-b' })
    expect(result.current.data).toBeNull()

    await act(async () => {
      await staleExecute()
    })

    // Tenant A's stale execute() resolved successfully, but must not have
    // clobbered tenant B's (still-loading) state.
    expect(result.current.data).toBeNull()
  })
})

describe('useAsync mutate generation guard', () => {
  it('applies a mutate when no expectedGeneration is passed (always-apply, e.g. session invalidation)', async () => {
    const asyncFn = vi.fn(() => Promise.resolve(['a1']))
    const { result } = renderHook(() => useAsync(asyncFn))

    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })

    act(() => {
      result.current.mutate(() => null)
    })

    expect(result.current.data).toBeNull()
  })

  it('applies a mutate whose captured generation still matches the current one', async () => {
    const asyncFn = vi.fn(() => Promise.resolve(['a1']))
    const { result } = renderHook(() => useAsync(asyncFn))

    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })

    const generation = result.current.captureGeneration()
    act(() => {
      result.current.mutate(current => [...(current ?? []), 'a2'], generation)
    })

    expect(result.current.data).toEqual(['a1', 'a2'])
  })

  it('ignores a mutate whose captured generation predates a tenant switch', async () => {
    const fetchForTenant = vi.fn((tenantId: string) =>
      tenantId === 'tenant-a'
        ? Promise.resolve(['a1'])
        : // eslint-disable-next-line @typescript-eslint/no-empty-function
          new Promise<string[]>(() => {}),
    )

    const { result, rerender } = renderHook(
      ({ tenantId }: { tenantId: string }) => {
        const asyncFn = useCallback(() => fetchForTenant(tenantId), [tenantId])
        return useAsync(asyncFn, { resetKey: tenantId })
      },
      { initialProps: { tenantId: 'tenant-a' } },
    )

    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })

    // Captured before starting a (hypothetical) create POST against tenant A.
    const staleGeneration = result.current.captureGeneration()

    rerender({ tenantId: 'tenant-b' })
    expect(result.current.data).toBeNull()

    act(() => {
      result.current.mutate(current => [...(current ?? []), 'stale-insert'], staleGeneration)
    })

    expect(result.current.data).toBeNull()
  })
})

describe('useAsync state table', () => {
  it('starts idle with no data/error when immediate is false', () => {
    const asyncFn = vi.fn(() => Promise.resolve('result'))
    const { result } = renderHook(() => useAsync(asyncFn, { immediate: false }))

    expect(result.current).toMatchObject({ status: 'idle', data: null, error: null })
  })

  it('starts loading with no data/error on an initial load', () => {
    const asyncFn = vi.fn(() => Promise.resolve('result'))
    const { result } = renderHook(() => useAsync(asyncFn))

    expect(result.current).toMatchObject({ status: 'loading', data: null, error: null })
  })

  it('moves to refreshing (keeps last known-good data, clears error) once a re-execute starts', async () => {
    let resolveSecond: ((value: string) => void) | undefined
    const asyncFn = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce('first')
      .mockImplementationOnce(() => new Promise<string>(resolve => (resolveSecond = resolve)))

    const { result } = renderHook(() => useAsync(asyncFn))

    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })

    act(() => {
      void result.current.execute()
    })

    expect(result.current).toMatchObject({ status: 'refreshing', data: 'first', error: null })

    await act(async () => {
      resolveSecond?.('second')
      await Promise.resolve()
    })

    expect(result.current).toMatchObject({ status: 'success', data: 'second', error: null })
  })

  it('moves to refreshError (keeps last known-good data, carries the new error) when a refresh fails', async () => {
    const asyncFn = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce('first')
      .mockRejectedValueOnce(new Error('refresh failed'))

    const { result } = renderHook(() => useAsync(asyncFn))

    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })

    await act(async () => {
      await result.current.execute()
    })

    expect(result.current.status).toBe('refreshError')
    expect(result.current.data).toBe('first')
    expect(result.current.error).toBeInstanceOf(Error)
  })

  it('a subsequent successful refetch clears a refreshError back to success', async () => {
    const asyncFn = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce('first')
      .mockRejectedValueOnce(new Error('refresh failed'))
      .mockResolvedValueOnce('recovered')

    const { result } = renderHook(() => useAsync(asyncFn))

    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })
    await act(async () => {
      await result.current.execute()
    })
    expect(result.current.status).toBe('refreshError')

    await act(async () => {
      await result.current.execute()
    })

    expect(result.current).toMatchObject({ status: 'success', data: 'recovered', error: null })
  })

  it('mutate with a non-null result sets status to success, clearing any prior error', async () => {
    const asyncFn = vi.fn<() => Promise<string>>(() => Promise.reject(new Error('boom')))
    const { result } = renderHook(() => useAsync(asyncFn))

    await waitFor(() => {
      expect(result.current.status).toBe('initialError')
    })

    act(() => {
      result.current.mutate(() => 'inserted')
    })

    expect(result.current).toMatchObject({ status: 'success', data: 'inserted', error: null })
  })

  it('mutate with a null result sets status to idle', async () => {
    const asyncFn = vi.fn(() => Promise.resolve('result'))
    const { result } = renderHook(() => useAsync(asyncFn))

    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })

    act(() => {
      result.current.mutate(() => null)
    })

    expect(result.current).toMatchObject({ status: 'idle', data: null, error: null })
  })
})

describe('toUiAsyncState', () => {
  it('passes idle/loading/refreshing/success through unchanged', () => {
    const states: AsyncState<string>[] = [
      { status: 'idle', data: null, error: null },
      { status: 'loading', data: null, error: null },
      { status: 'refreshing', data: 'x', error: null },
      { status: 'success', data: 'x', error: null },
    ]

    for (const state of states) {
      expect(toUiAsyncState(state)).toEqual(state)
    }
  })

  it('curates an initialError into a UiError, dropping the raw unknown', () => {
    const state: AsyncState<string> = {
      status: 'initialError',
      data: null,
      error: new AppError({ code: 'conflict', message: 'Já existe.', retryable: false }),
    }

    expect(toUiAsyncState(state)).toEqual({
      status: 'initialError',
      data: null,
      error: { message: 'Já existe.', retryable: false },
    })
  })

  it('curates a refreshError into a UiError while preserving last known-good data', () => {
    const state: AsyncState<string> = {
      status: 'refreshError',
      data: 'last-known-good',
      error: new Error('unexpected'),
    }

    expect(toUiAsyncState(state)).toEqual({
      status: 'refreshError',
      data: 'last-known-good',
      error: { message: 'Ocorreu um erro inesperado. Tente novamente.', retryable: true },
    })
  })
})
