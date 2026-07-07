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
})
