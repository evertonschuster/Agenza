import { Tenant } from '@/features/auth/domain/value-objects/Tenant'
import { InvalidUserError } from '@/features/auth/domain/errors/InvalidUserError'
import { failure, success, type Result } from '@/shared/application/Result'

interface CreateUserInput {
  id: string
  tenant: Tenant
  email?: string
  name?: string
}

// email/name are optional: the exact claims IdentityServer issues aren't
// confirmed yet - adjust once verified against a real token.
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

  static create(input: CreateUserInput): Result<User, InvalidUserError> {
    if (input.id.trim().length === 0) {
      return failure(new InvalidUserError('User id must not be empty'))
    }

    return success(new User(input.id, input.tenant, input.email, input.name))
  }

  belongsToTenant(tenant: Tenant): boolean {
    return this.tenant.equals(tenant)
  }
}
