import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
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
})
