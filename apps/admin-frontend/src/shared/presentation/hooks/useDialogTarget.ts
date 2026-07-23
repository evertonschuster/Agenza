import { useState } from 'react'

/** A discriminant, not a sentinel value - unlike `'new' | T`, this can never collide with a legitimate T (e.g. a T that happens to be the string 'new'). */
export type DialogTarget<T> = { kind: 'create' } | { kind: 'edit'; item: T }

export interface UseDialogTargetResult<T> {
  formTarget: DialogTarget<T> | null
  displayTarget: DialogTarget<T> | null
  isOpen: boolean
  openCreate: () => void
  openEdit: (item: T) => void
  close: () => void
}

/** Shared "which record (if any) opened the create/edit dialog" state - TagsPage/CategoriesPage's reference pattern. */
export function useDialogTarget<T>(): UseDialogTargetResult<T> {
  const [formTarget, setFormTarget] = useState<DialogTarget<T> | null>(null)
  const [displayTarget, setDisplayTarget] = useState<DialogTarget<T> | null>(null)

  function openCreate(): void {
    setFormTarget({ kind: 'create' })
    setDisplayTarget({ kind: 'create' })
  }

  function openEdit(item: T): void {
    setFormTarget({ kind: 'edit', item })
    setDisplayTarget({ kind: 'edit', item })
  }

  function close(): void {
    // displayTarget stays as-is: Dialog fades out over ~100ms after `open`
    // flips to false, and clearing it here would blank the form mid-animation.
    setFormTarget(null)
  }

  return { formTarget, displayTarget, isOpen: formTarget !== null, openCreate, openEdit, close }
}
