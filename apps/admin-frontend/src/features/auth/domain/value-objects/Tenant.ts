import { InvalidTenantError } from '@/features/auth/domain/errors/InvalidTenantError'

export class Tenant {
  readonly id: string

  private constructor(id: string) {
    this.id = id
  }

  static create(id: string): Tenant {
    const trimmedId = id.trim()

    if (trimmedId.length === 0) {
      throw new InvalidTenantError('Tenant id must not be empty')
    }

    return new Tenant(trimmedId)
  }

  equals(other: Tenant): boolean {
    return this.id === other.id
  }
}
