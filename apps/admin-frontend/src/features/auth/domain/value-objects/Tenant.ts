import { InvalidTenantError } from '@/features/auth/domain/errors/InvalidTenantError'

/**
 * Represents a business/tenant in the multi-tenant system. A Tenant is the
 * unit of data isolation: every Appointment, Client, Service, and
 * Conversation belongs to exactly one Tenant, and that boundary must never
 * be crossed.
 */
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
