/**
 * Thrown by AuthenticatedHttpClient instead of making a request when there
 * is no valid access token (docs/API.md) - callers should treat this the
 * same as a 401 and redirect to login, rather than surfacing a network error.
 */
export class UnauthenticatedError extends Error {
  constructor() {
    super('Sessão inválida - é necessário fazer login novamente.')
    this.name = 'UnauthenticatedError'
  }
}
