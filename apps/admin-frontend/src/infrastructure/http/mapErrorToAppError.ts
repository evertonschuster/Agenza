import { AppError } from '../../application/errors/AppError'
import { ApiError } from './ApiError'
import { UnauthenticatedError } from './UnauthenticatedError'
import { NetworkError } from './NetworkError'
import { TimeoutError } from './TimeoutError'
import type { ProblemDetails } from './ProblemDetails'

const UNAUTHENTICATED_MESSAGE = 'Sua sessão expirou. Faça login novamente.'

function flattenFieldErrors(errors: ProblemDetails['errors']): Record<string, string> | undefined {
  if (errors === undefined) {
    return undefined
  }

  const flattened: Record<string, string> = {}
  for (const [field, fieldErrors] of Object.entries(errors)) {
    const message = fieldErrors[0]?.message
    if (message !== undefined) {
      flattened[field] = message
    }
  }

  return Object.keys(flattened).length > 0 ? flattened : undefined
}

function mapApiError(error: ApiError): AppError {
  const rawFieldErrors = flattenFieldErrors(error.details?.errors)
  const backendCode = error.details?.code

  if (error.status === 400) {
    return new AppError({
      code: 'validation',
      message: error.message,
      retryable: false,
      ...(rawFieldErrors !== undefined ? { rawFieldErrors } : {}),
      ...(backendCode !== undefined ? { backendCode } : {}),
    })
  }
  if (error.status === 401) {
    return new AppError({
      code: 'unauthenticated',
      message: UNAUTHENTICATED_MESSAGE,
      retryable: false,
    })
  }
  if (error.status === 403) {
    return new AppError({
      code: 'unauthorized',
      message: 'Você não tem permissão para realizar esta ação.',
      retryable: false,
    })
  }
  if (error.status === 404) {
    return new AppError({
      code: 'notFound',
      message: error.message,
      retryable: false,
      ...(backendCode !== undefined ? { backendCode } : {}),
    })
  }
  if (error.status === 409) {
    return new AppError({
      code: 'conflict',
      message: error.message,
      retryable: false,
      ...(backendCode !== undefined ? { backendCode } : {}),
    })
  }

  return new AppError({
    code: 'unexpected',
    message: 'Não foi possível concluir a operação. Tente novamente.',
    retryable: true,
  })
}

/**
 * The one place that classifies "what kind of failure was this" into the
 * taxonomy presentation works with (AppError) - called from inside
 * AuthenticatedHttpClient only, so ApiError/ProblemDetails/NetworkError/
 * TimeoutError never cross into application or presentation (docs/adr/007).
 * Idempotent on an already-converted AppError, since a caller further up
 * the stack may re-wrap a lower-level call's result.
 */
export function mapErrorToAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error
  }
  if (error instanceof UnauthenticatedError) {
    return new AppError({
      code: 'unauthenticated',
      message: UNAUTHENTICATED_MESSAGE,
      retryable: false,
    })
  }
  if (error instanceof TimeoutError) {
    return new AppError({
      code: 'timeout',
      message: 'O servidor demorou para responder. Tente novamente.',
      retryable: true,
    })
  }
  if (error instanceof NetworkError) {
    return new AppError({
      code: 'network',
      message: 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
      retryable: true,
    })
  }
  if (error instanceof ApiError) {
    return mapApiError(error)
  }

  return new AppError({
    code: 'unexpected',
    message: 'Ocorreu um erro inesperado. Tente novamente.',
    retryable: true,
  })
}
