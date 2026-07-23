import { describe, it, expect, expectTypeOf } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDialogTarget, type DialogTarget } from '@/shared/presentation/hooks/useDialogTarget'

interface Item {
  id: string
}

describe('useDialogTarget', () => {
  it('starts closed with no target', () => {
    const { result } = renderHook(() => useDialogTarget<Item>())

    expect(result.current.isOpen).toBe(false)
    expect(result.current.formTarget).toBeNull()
    expect(result.current.displayTarget).toBeNull()
  })

  it('openCreate opens a create target, not an edit target', () => {
    const { result } = renderHook(() => useDialogTarget<Item>())

    act(() => {
      result.current.openCreate()
    })

    expect(result.current.isOpen).toBe(true)
    expect(result.current.formTarget).toEqual({ kind: 'create' })
    expect(result.current.displayTarget).toEqual({ kind: 'create' })
  })

  it('openEdit opens an edit target carrying the item, not a create target', () => {
    const { result } = renderHook(() => useDialogTarget<Item>())
    const item: Item = { id: 'item-1' }

    act(() => {
      result.current.openEdit(item)
    })

    expect(result.current.isOpen).toBe(true)
    expect(result.current.formTarget).toEqual({ kind: 'edit', item })
    expect(result.current.displayTarget).toEqual({ kind: 'edit', item })
  })

  it('close clears formTarget (and isOpen) but keeps displayTarget for the fade-out animation', () => {
    const { result } = renderHook(() => useDialogTarget<Item>())
    const item: Item = { id: 'item-1' }

    act(() => {
      result.current.openEdit(item)
    })
    act(() => {
      result.current.close()
    })

    expect(result.current.isOpen).toBe(false)
    expect(result.current.formTarget).toBeNull()
    expect(result.current.displayTarget).toEqual({ kind: 'edit', item })
  })

  it('a second openCreate/openEdit after close replaces the stale displayTarget', () => {
    const { result } = renderHook(() => useDialogTarget<Item>())
    const first: Item = { id: 'item-1' }
    const second: Item = { id: 'item-2' }

    act(() => {
      result.current.openEdit(first)
    })
    act(() => {
      result.current.close()
    })
    act(() => {
      result.current.openEdit(second)
    })

    expect(result.current.displayTarget).toEqual({ kind: 'edit', item: second })
  })

  it('rejects an edit target missing its item at the type level', () => {
    // @ts-expect-error an edit target must carry `item`
    const invalid: DialogTarget<Item> = { kind: 'edit' }
    void invalid
  })

  it('rejects a create target carrying an item at the type level', () => {
    // @ts-expect-error a create target must not carry `item`
    const invalid: DialogTarget<Item> = { kind: 'create', item: { id: 'x' } }
    void invalid
  })

  it('narrows to `item: Item` only on the edit branch, never on create', () => {
    const target = { kind: 'edit', item: { id: 'x' } } as DialogTarget<Item>
    if (target.kind === 'edit') {
      expectTypeOf(target.item).toEqualTypeOf<Item>()
    }
  })
})
