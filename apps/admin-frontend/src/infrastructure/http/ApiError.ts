/**
 * Thrown by AuthenticatedHttpClient for any non-2xx response. Shape
 * matches the placeholder error contract in docs/API.md - update both
 * once the backend's real error shape is confirmed.
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
