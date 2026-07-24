// Internal technical marker - mapErrorToAppError converts it to a curated
// pt-BR AppError before it leaves this module.
export class NetworkError extends Error {
  constructor() {
    super('Network request failed')
    this.name = 'NetworkError'
  }
}
