import type { ProblemDetails } from '@/shared/infrastructure/http/ProblemDetails'

/**
 * Thrown by AuthenticatedHttpClient for a non-2xx response other than 401
 * (a missing/invalid token throws UnauthenticatedError instead). `message`
 * is populated from the backend's RFC 7807 Problem Details body (`title`,
 * falling back to `detail` - see docs/API.md); `details` carries the
 * safely-parsed ProblemDetails (including `code`/`errors`, when present)
 * for callers that need more than the message.
 */
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
