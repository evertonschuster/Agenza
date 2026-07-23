/**
 * Base class for all errors originating from business rule violations in
 * the domain layer. Use cases in the application layer can check
 * `error instanceof DomainError` to distinguish expected business-rule
 * failures (e.g. "tenant id is empty") from unexpected infrastructure
 * failures (e.g. a network error), and react to each differently.
 */
export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}
