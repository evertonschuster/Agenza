export type AppErrorCode =
  | 'validation'
  | 'conflict'
  | 'notFound'
  | 'unauthenticated'
  | 'unauthorized'
  | 'network'
  | 'timeout'
  | 'unexpected'

interface AppErrorInput {
  code: AppErrorCode
  message: string
  retryable: boolean
  /**
   * Raw backend field name -> first message, keyed by the API's own
   * PascalCase property names (e.g. "Name"), not yet translated to any
   * specific form's field name - see mapApiErrorToForm for that step.
   */
  rawFieldErrors?: Record<string, string>
  /** The backend's structured error code (e.g. "Tag.DuplicateName"), when present. */
  backendCode?: string
}

/**
 * The one error shape presentation ever needs to know about. Every
 * infrastructure failure (HTTP status, ProblemDetails, network/timeout
 * failure) is converted into this at the infrastructure boundary
 * (AuthenticatedHttpClient) before it reaches a repository, use case, or
 * component - presentation never imports ApiError/ProblemDetails/
 * NetworkError/TimeoutError directly (docs/adr/007).
 */
export class AppError extends Error {
  readonly code: AppErrorCode
  readonly retryable: boolean
  readonly rawFieldErrors: Record<string, string> | undefined
  readonly backendCode: string | undefined

  constructor(input: AppErrorInput) {
    super(input.message)
    this.name = 'AppError'
    this.code = input.code
    this.retryable = input.retryable
    this.rawFieldErrors = input.rawFieldErrors
    this.backendCode = input.backendCode
  }
}
