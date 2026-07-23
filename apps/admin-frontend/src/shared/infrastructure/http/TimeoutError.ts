/**
 * Thrown by AuthenticatedHttpClient when the request's AbortSignal.timeout
 * fires before a response arrives - kept as an internal, technical marker;
 * mapErrorToAppError converts it to a curated pt-BR AppError before it
 * leaves this module.
 */
export class TimeoutError extends Error {
  constructor() {
    super('Request timed out')
    this.name = 'TimeoutError'
  }
}
