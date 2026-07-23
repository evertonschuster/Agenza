import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { MouseEvent } from 'react'
import { Service } from '@/features/catalog/domain/entities/Service'
import { AppError } from '@/shared/application/AppError'
import { useServiceEditor } from '@/features/catalog/presentation/services/useServiceEditor'
import type { ServiceFormValues } from '@/features/catalog/presentation/services/ServiceForm.schema'

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

const formValues: ServiceFormValues = {
  name: 'Corte',
  description: '',
  durationMinutes: 30,
  minDurationMinutes: 15,
  maxDurationMinutes: 45,
  price: 80,
  maxDiscountPercentage: 5,
  categoryId: null,
  tagIds: [],
}

function fakeClickEvent(): MouseEvent<HTMLButtonElement> {
  return {
    currentTarget: document.createElement('button'),
  } as unknown as MouseEvent<HTMLButtonElement>
}

describe('useServiceEditor', () => {
  it('starts closed', () => {
    const { result } = renderHook(() => useServiceEditor({ onCreate: vi.fn(), onUpdate: vi.fn() }))

    expect(result.current.editor.isOpen).toBe(false)
    expect(result.current.editor.content).toBeNull()
  })

  it('onOpenCreate opens a create target with the create title/label and no code', () => {
    const { result } = renderHook(() => useServiceEditor({ onCreate: vi.fn(), onUpdate: vi.fn() }))

    act(() => {
      result.current.onOpenCreate(fakeClickEvent())
    })

    expect(result.current.editor.isOpen).toBe(true)
    expect(result.current.editor.content?.kind).toBe('create')
    expect(result.current.editor.content?.code).toBeNull()
    expect(result.current.editor.content?.title).toBe('Novo serviço')
    expect(result.current.editor.content?.submitLabel).toBe('Criar serviço')
  })

  it('onOpenEdit opens with the service as target, its code, and the edit title/label', () => {
    const { result } = renderHook(() => useServiceEditor({ onCreate: vi.fn(), onUpdate: vi.fn() }))

    act(() => {
      result.current.onOpenEdit(service, fakeClickEvent())
    })

    expect(result.current.editor.content?.kind).toBe('edit')
    expect(
      result.current.editor.content?.kind === 'edit' ? result.current.editor.content.item : null,
    ).toBe(service)
    expect(result.current.editor.content?.code).toBe(1001)
    expect(result.current.editor.content?.title).toBe('Editar serviço')
    expect(result.current.editor.content?.submitLabel).toBe('Salvar alterações')
  })

  it('onRequestClose closes immediately when the form is not dirty', () => {
    const { result } = renderHook(() => useServiceEditor({ onCreate: vi.fn(), onUpdate: vi.fn() }))
    act(() => {
      result.current.onOpenCreate(fakeClickEvent())
    })

    act(() => {
      result.current.editor.onRequestClose()
    })

    expect(result.current.editor.isOpen).toBe(false)
    expect(result.current.discardConfirmation.isOpen).toBe(false)
  })

  it('onRequestClose asks for discard confirmation instead of closing when the form is dirty', () => {
    const { result } = renderHook(() => useServiceEditor({ onCreate: vi.fn(), onUpdate: vi.fn() }))
    act(() => {
      result.current.onOpenCreate(fakeClickEvent())
    })
    act(() => {
      result.current.editor.onDirtyChange(true)
    })

    act(() => {
      result.current.editor.onRequestClose()
    })

    expect(result.current.editor.isOpen).toBe(true)
    expect(result.current.discardConfirmation.isOpen).toBe(true)
  })

  it('discardConfirmation.onConfirm closes the form', () => {
    const { result } = renderHook(() => useServiceEditor({ onCreate: vi.fn(), onUpdate: vi.fn() }))
    act(() => {
      result.current.onOpenCreate(fakeClickEvent())
    })
    act(() => {
      result.current.editor.onDirtyChange(true)
    })
    act(() => {
      result.current.editor.onRequestClose()
    })

    act(() => {
      result.current.discardConfirmation.onConfirm()
    })

    expect(result.current.editor.isOpen).toBe(false)
    expect(result.current.discardConfirmation.isOpen).toBe(false)
  })

  it('discardConfirmation.onCancel keeps the form open and dismisses only the confirmation', () => {
    const { result } = renderHook(() => useServiceEditor({ onCreate: vi.fn(), onUpdate: vi.fn() }))
    act(() => {
      result.current.onOpenCreate(fakeClickEvent())
    })
    act(() => {
      result.current.editor.onDirtyChange(true)
    })
    act(() => {
      result.current.editor.onRequestClose()
    })

    act(() => {
      result.current.discardConfirmation.onCancel()
    })

    expect(result.current.editor.isOpen).toBe(true)
    expect(result.current.discardConfirmation.isOpen).toBe(false)
  })

  it('submitting a new service calls onCreate and closes the dialog on success', async () => {
    const onCreate = vi.fn(() => Promise.resolve(service))
    const { result } = renderHook(() => useServiceEditor({ onCreate, onUpdate: vi.fn() }))
    act(() => {
      result.current.onOpenCreate(fakeClickEvent())
    })

    await act(async () => {
      await result.current.editor.onSubmit(formValues)
    })

    expect(onCreate).toHaveBeenCalledExactlyOnceWith({
      name: 'Corte',
      description: null,
      durationMinutes: 30,
      minDurationMinutes: 15,
      maxDurationMinutes: 45,
      price: 80,
      maxDiscountPercentage: 5,
      categoryId: null,
      tagIds: [],
    })
    expect(result.current.editor.isOpen).toBe(false)
  })

  it('submitting an edit calls onUpdate with the target id', async () => {
    const onUpdate = vi.fn(() => Promise.resolve(service))
    const { result } = renderHook(() => useServiceEditor({ onCreate: vi.fn(), onUpdate }))
    act(() => {
      result.current.onOpenEdit(service, fakeClickEvent())
    })

    await act(async () => {
      await result.current.editor.onSubmit(formValues)
    })

    expect(onUpdate).toHaveBeenCalledExactlyOnceWith(
      'service-1',
      expect.objectContaining({ name: 'Corte' }),
    )
  })

  it('keeps the dialog open and surfaces a mapped server error when submit fails', async () => {
    const onCreate = vi.fn(() =>
      Promise.reject(
        new AppError({
          code: 'validation',
          message: 'Ocorreram erros de validação.',
          retryable: false,
          rawFieldErrors: { Name: 'O nome é obrigatório.' },
        }),
      ),
    )
    const { result } = renderHook(() => useServiceEditor({ onCreate, onUpdate: vi.fn() }))
    act(() => {
      result.current.onOpenCreate(fakeClickEvent())
    })

    await act(async () => {
      await result.current.editor.onSubmit(formValues)
    })

    expect(result.current.editor.isOpen).toBe(true)
    expect(
      result.current.editor.serverError?.fieldErrors.find(({ field }) => field === 'name')?.message,
    ).toBe('O nome é obrigatório.')
    expect(result.current.editor.isSubmitting).toBe(false)
  })
})
