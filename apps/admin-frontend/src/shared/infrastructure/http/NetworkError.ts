/**
 * Thrown by AuthenticatedHttpClient when `fetch` itself rejects for a
 * reason other than the timeout signal (DNS failure, connection refused,
 * offline) - kept as an internal, technical marker; mapErrorToAppError
 * converts it to a curated pt-BR AppError before it leaves this module.
 */
export class NetworkError extends Error {
  constructor() {
    super('Network request failed')
    this.name = 'NetworkError'
  }
}
