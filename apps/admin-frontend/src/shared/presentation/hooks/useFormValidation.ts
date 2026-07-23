import { useState } from 'react'

interface UseFormValidationResult<T> {
  touched: boolean
  markTouched: () => void
  displayedError: (values: T) => string | null
  validateForSubmit: (values: T) => string | null
}

/**
 * Errors stay hidden until the user has actually interacted with the form
 * (blurred a field or attempted a submit) - otherwise a fresh form would
 * show "informe o nome" before anyone has typed anything.
 */
export function useFormValidation<T>(
  validate: (values: T) => string | null,
): UseFormValidationResult<T> {
  const [touched, setTouched] = useState(false)

  function markTouched(): void {
    setTouched(true)
  }

  function displayedError(values: T): string | null {
    return touched ? validate(values) : null
  }

  function validateForSubmit(values: T): string | null {
    setTouched(true)
    return validate(values)
  }

  return { touched, markTouched, displayedError, validateForSubmit }
}
