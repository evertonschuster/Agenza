import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFormValidation } from '@/shared/presentation/hooks/useFormValidation'

interface Values {
  name: string
}

function validate(values: Values): string | null {
  return values.name.trim().length === 0 ? 'Informe o nome.' : null
}

describe('useFormValidation', () => {
  it('hides the error until the form is touched', () => {
    const { result } = renderHook(() => useFormValidation(validate))

    expect(result.current.displayedError({ name: '' })).toBeNull()
  })

  it('shows the error once a field has been blurred', () => {
    const { result } = renderHook(() => useFormValidation(validate))

    act(() => {
      result.current.markTouched()
    })

    expect(result.current.displayedError({ name: '' })).toBe('Informe o nome.')
    expect(result.current.displayedError({ name: 'Filled' })).toBeNull()
  })

  it('marks the form touched and returns the error on a failed submit attempt', () => {
    const { result } = renderHook(() => useFormValidation(validate))

    let submitError: string | null = null
    act(() => {
      submitError = result.current.validateForSubmit({ name: '' })
    })

    expect(submitError).toBe('Informe o nome.')
    expect(result.current.displayedError({ name: '' })).toBe('Informe o nome.')
  })

  it('returns null from validateForSubmit when the values are valid', () => {
    const { result } = renderHook(() => useFormValidation(validate))

    let submitError: string | null = null
    act(() => {
      submitError = result.current.validateForSubmit({ name: 'Filled' })
    })

    expect(submitError).toBeNull()
  })
})
