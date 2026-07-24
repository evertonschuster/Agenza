import { Tenant } from '@/features/auth/domain/value-objects/Tenant'
import { InvalidUserError } from '@/features/auth/domain/errors/InvalidUserError'

interface CreateUserInput {
  id: string
  tenant: Tenant
  email?: string
  name?: string
}

/**
 * Represents a logged-in business owner/staff member. A User always
 * belongs to exactly one Tenant (one-to-one, per product decision) -
 * there is no concept of a User without a Tenant in this system.
 *
 * email and name are optional because the exact claims IdentityServer
 * issues in the token have not yet been confirmed; this entity will be
 * adjusted once that's verified against a real token.
 */
export class User {
  readonly id: string
  readonly tenant: Tenant
  readonly email?: string
  readonly name?: string

  private constructor(id: string, tenant: Tenant, email?: string, name?: string) {
    this.id = id
    this.tenant = tenant
    if (email !== undefined) {
      this.email = email
    }
    if (name !== undefined) {
      this.name = name
    }
  }

  static create(input: CreateUserInput): User {
    if (input.id.trim().length === 0) {
      throw new InvalidUserError('User id must not be empty')
    }

    return new User(input.id, input.tenant, input.email, input.name)
  }

  belongsToTenant(tenant: Tenant): boolean {
    return this.tenant.equals(tenant)
  }
}
