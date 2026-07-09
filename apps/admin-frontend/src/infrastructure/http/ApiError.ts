/**
 * Thrown by AuthenticatedHttpClient for any non-2xx response. `message`
 * is populated from the backend's RFC 7807 Problem Details body (`title`,
 * falling back to `detail` - see docs/API.md); `details` carries the raw
 * parsed body for callers that need more than the message.
 */
export class ApiError extends Error {
  readonly status: number
  readonly details: unknown

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}
