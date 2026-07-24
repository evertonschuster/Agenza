import type { ProblemDetails } from '@/shared/infrastructure/http/ProblemDetails'

// Thrown for a non-2xx response other than 401 (which throws
// UnauthenticatedError instead); `details` carries the parsed ProblemDetails.
export class ApiError extends Error {
  readonly status: number
  readonly details: ProblemDetails | undefined

  constructor(status: number, message: string, details?: ProblemDetails) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}
