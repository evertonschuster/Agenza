import { AppError } from '@/shared/application/AppError'

const UNEXPECTED_ERROR_MESSAGE = 'Ocorreu um erro inesperado. Tente novamente.'

/**
 * The one shape a component may read to render a failure - curated message
 * and retryability already resolved, never a raw `unknown` a component
 * would have to interpret itself (e.g. sniffing `instanceof Error`).
 */
export interface UiError {
  readonly message: string
  readonly retryable: boolean
}

/**
 * Converts a caught `unknown` into a `UiError`. An `AppError` (every
 * infrastructure failure, docs/adr/007) is already curated - anything else
 * (a domain validation error, a genuine bug) is a failure presentation was
 * never meant to interpret, so it gets the same generic, retryable fallback
 * `mapErrorToAppError` uses for its own unclassified case, never its raw
 * `.message`.
 */
export function toUiError(error: unknown): UiError {
  if (error instanceof AppError) {
    return { message: error.message, retryable: error.retryable }
  }
  return { message: UNEXPECTED_ERROR_MESSAGE, retryable: true }
}
