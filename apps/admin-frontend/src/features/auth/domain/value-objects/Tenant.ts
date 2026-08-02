import { InvalidTenantError } from '@/features/auth/domain/errors/InvalidTenantError'
import { failure, success, type Result } from '@/shared/application/Result'

export class Tenant {
  readonly id: string

  private constructor(id: string) {
    this.id = id
  }

  static create(id: string): Result<Tenant, InvalidTenantError> {
    const trimmedId = id.trim()

    if (trimmedId.length === 0) {
      return failure(new InvalidTenantError('Tenant id must not be empty'))
    }

    return success(new Tenant(trimmedId))
  }

  equals(other: Tenant): boolean {
    return this.id === other.id
  }
}
