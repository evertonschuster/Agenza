import { describe, it, expect } from 'vitest'
import { toUiError } from '@/shared/application/UiError'
import { AppError } from '@/shared/application/AppError'

describe('toUiError', () => {
  it('carries an AppError message and retryability through unchanged', () => {
    const error = new AppError({ code: 'conflict', message: 'Já existe.', retryable: false })

    expect(toUiError(error)).toEqual({ message: 'Já existe.', retryable: false })
  })

  it('never exposes a plain Error instance raw message', () => {
    const error = new Error('undefined.trim is not a function')

    expect(toUiError(error)).toEqual({
      message: 'Ocorreu um erro inesperado. Tente novamente.',
      retryable: true,
    })
  })

  it('never exposes a non-Error thrown value', () => {
    expect(toUiError('some string thrown directly')).toEqual({
      message: 'Ocorreu um erro inesperado. Tente novamente.',
      retryable: true,
    })
    expect(toUiError(null)).toEqual({
      message: 'Ocorreu um erro inesperado. Tente novamente.',
      retryable: true,
    })
  })
})
