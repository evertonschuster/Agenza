// Thrown instead of making a request when there's no valid access token -
// callers treat this like a 401, not a network error.
export class UnauthenticatedError extends Error {
  constructor() {
    super('Sessão inválida - é necessário fazer login novamente.')
    this.name = 'UnauthenticatedError'
  }
}
