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
  /** Raw backend field name (PascalCase, e.g. "Name") -> first message; see mapApiErrorToForm. */
  rawFieldErrors?: Record<string, string>
  /** The backend's structured error code (e.g. "Tag.DuplicateName"), when present. */
  backendCode?: string
}

// The one error shape presentation ever needs - every infrastructure failure
// is converted into this at the boundary (AuthenticatedHttpClient, docs/adr/007).
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
