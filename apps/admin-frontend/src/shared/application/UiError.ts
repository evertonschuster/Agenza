import { AppError } from '@/shared/application/AppError'

const UNEXPECTED_ERROR_MESSAGE = 'Ocorreu um erro inesperado. Tente novamente.'

// The one shape a component may read to render a failure - never a raw
// `unknown` it would have to interpret itself.
export interface UiError {
  readonly message: string
  readonly retryable: boolean
}

// Anything that isn't an already-curated AppError (a domain error, a bug)
// gets the same generic retryable fallback - never its raw `.message`.
export function toUiError(error: unknown): UiError {
  if (error instanceof AppError) {
    return { message: error.message, retryable: error.retryable }
  }
  return { message: UNEXPECTED_ERROR_MESSAGE, retryable: true }
}
