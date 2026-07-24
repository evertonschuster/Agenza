import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { Service } from '@/features/catalog/domain/entities/Service'
import { useServiceDeletion } from '@/features/catalog/presentation/services/useServiceDeletion'

const service = Service.create({
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

describe('useServiceDeletion', () => {
  it('starts with no target', () => {
    const { result } = renderHook(() => useServiceDeletion({ onDelete: vi.fn() }))

    expect(result.current.target).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.isDeleting).toBe(false)
  })

  it('onRequestDelete sets the target and clears any previous error', () => {
    const { result } = renderHook(() => useServiceDeletion({ onDelete: vi.fn() }))

    act(() => {
      result.current.onRequestDelete(service)
    })

    expect(result.current.target).toBe(service)
    expect(result.current.error).toBeNull()
  })

  it('onCancel clears the target', () => {
    const { result } = renderHook(() => useServiceDeletion({ onDelete: vi.fn() }))
    act(() => {
      result.current.onRequestDelete(service)
    })

    act(() => {
      result.current.onCancel()
    })

    expect(result.current.target).toBeNull()
  })

  it('onConfirm calls onDelete with the target id and clears the target on success', async () => {
    const onDelete = vi.fn(() => Promise.resolve())
    const { result } = renderHook(() => useServiceDeletion({ onDelete }))
    act(() => {
      result.current.onRequestDelete(service)
    })

    await act(async () => {
      await result.current.onConfirm()
    })

    expect(onDelete).toHaveBeenCalledExactlyOnceWith('service-1')
    expect(result.current.target).toBeNull()
  })

  it('keeps the target and surfaces an error message when onDelete fails', async () => {
    const onDelete = vi.fn(() => Promise.reject(new Error('falhou')))
    const { result } = renderHook(() => useServiceDeletion({ onDelete }))
    act(() => {
      result.current.onRequestDelete(service)
    })

    await act(async () => {
      await result.current.onConfirm()
    })

    expect(result.current.target).toBe(service)
    expect(result.current.error).toBe('falhou')
    expect(result.current.isDeleting).toBe(false)
  })

  it('onConfirm without a target is a no-op', async () => {
    const onDelete = vi.fn(() => Promise.resolve())
    const { result } = renderHook(() => useServiceDeletion({ onDelete }))

    await act(async () => {
      await result.current.onConfirm()
    })

    expect(onDelete).not.toHaveBeenCalled()
  })
})
