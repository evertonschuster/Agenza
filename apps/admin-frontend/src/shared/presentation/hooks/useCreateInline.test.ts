import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useCreateInline } from '@/shared/presentation/hooks/useCreateInline'

type Field = 'name'
const FIELD_MAP: Record<string, Field> = { Name: 'name' }
const CODE_FIELD_MAP: Record<string, Field> = {}
const FALLBACK_MESSAGE = 'Não foi possível criar o registro.'

describe('useCreateInline', () => {
  it('calls onCreated with the created item on success', async () => {
    const createdItem = { id: '1', name: 'VIP' }
    const createFn = vi.fn(() => Promise.resolve(createdItem))
    const onCreated = vi.fn()
    const { result } = renderHook(() =>
      useCreateInline(createFn, FIELD_MAP, CODE_FIELD_MAP, FALLBACK_MESSAGE),
    )

    await act(async () => {
      await result.current.create({ name: 'VIP' }, onCreated)
    })

    expect(onCreated).toHaveBeenCalledExactlyOnceWith(createdItem)
    expect(result.current.isCreating).toBe(false)
    expect(result.current.serverError).toBeNull()
  })

  it('tracks isCreating true while the request is pending', async () => {
    let resolveCreate: ((item: { id: string; name: string }) => void) | undefined
    const createFn = vi.fn(
      () =>
        new Promise<{ id: string; name: string }>(resolve => {
          resolveCreate = resolve
        }),
    )
    const { result } = renderHook(() =>
      useCreateInline(createFn, FIELD_MAP, CODE_FIELD_MAP, FALLBACK_MESSAGE),
    )

    let createPromise: Promise<void>
    act(() => {
      createPromise = result.current.create({ name: 'VIP' }, vi.fn())
    })

    await waitFor(() => {
      expect(result.current.isCreating).toBe(true)
    })

    await act(async () => {
      resolveCreate?.({ id: '1', name: 'VIP' })
      await createPromise
    })

    expect(result.current.isCreating).toBe(false)
  })

  it('sets a server error on failure without calling onCreated', async () => {
    const createFn = vi.fn(() => Promise.reject(new Error('network down')))
    const onCreated = vi.fn()
    const { result } = renderHook(() =>
      useCreateInline(createFn, FIELD_MAP, CODE_FIELD_MAP, FALLBACK_MESSAGE),
    )

    await act(async () => {
      await result.current.create({ name: 'VIP' }, onCreated)
    })

    expect(onCreated).not.toHaveBeenCalled()
    expect(result.current.isCreating).toBe(false)
    expect(result.current.serverError?.globalMessage).toBe('network down')
  })

  it('reset() clears a server error and isCreating immediately', async () => {
    const createFn = vi.fn(() => Promise.reject(new Error('boom')))
    const { result } = renderHook(() =>
      useCreateInline(createFn, FIELD_MAP, CODE_FIELD_MAP, FALLBACK_MESSAGE),
    )

    await act(async () => {
      await result.current.create({ name: 'VIP' }, vi.fn())
    })
    expect(result.current.serverError).not.toBeNull()

    act(() => {
      result.current.reset()
    })

    expect(result.current.serverError).toBeNull()
    expect(result.current.isCreating).toBe(false)
  })

  it('does not call onCreated when the user cancels (reset) while the create is still pending', async () => {
    let resolveCreate: ((item: { id: string; name: string }) => void) | undefined
    const createFn = vi.fn(
      () =>
        new Promise<{ id: string; name: string }>(resolve => {
          resolveCreate = resolve
        }),
    )
    const onCreated = vi.fn()
    const { result } = renderHook(() =>
      useCreateInline(createFn, FIELD_MAP, CODE_FIELD_MAP, FALLBACK_MESSAGE),
    )

    let createPromise: Promise<void>
    act(() => {
      // Mirrors ServiceForm: the inline form's own "Cancelar" button is not
      // disabled while isCreating is true, so a user can click it mid-request.
      createPromise = result.current.create({ name: 'VIP' }, onCreated)
    })
    await waitFor(() => {
      expect(result.current.isCreating).toBe(true)
    })

    act(() => {
      result.current.reset()
    })
    expect(result.current.isCreating).toBe(false)

    await act(async () => {
      resolveCreate?.({ id: '1', name: 'VIP' })
      await createPromise
    })

    expect(onCreated).not.toHaveBeenCalled()
    // The stale resolution must not resurrect the "creating" state the user
    // already canceled out of, nor silently apply a delayed success.
    expect(result.current.isCreating).toBe(false)
  })

  it('does not set a server error from a request that failed after the user already canceled it', async () => {
    let rejectCreate: ((error: Error) => void) | undefined
    const createFn = vi.fn(
      () =>
        new Promise<{ id: string; name: string }>((_resolve, reject) => {
          rejectCreate = reject
        }),
    )
    const { result } = renderHook(() =>
      useCreateInline(createFn, FIELD_MAP, CODE_FIELD_MAP, FALLBACK_MESSAGE),
    )

    let createPromise: Promise<void>
    act(() => {
      createPromise = result.current.create({ name: 'VIP' }, vi.fn())
    })
    await waitFor(() => {
      expect(result.current.isCreating).toBe(true)
    })

    act(() => {
      result.current.reset()
    })

    await act(async () => {
      rejectCreate?.(new Error('too late'))
      await createPromise
    })

    expect(result.current.serverError).toBeNull()
  })
})
