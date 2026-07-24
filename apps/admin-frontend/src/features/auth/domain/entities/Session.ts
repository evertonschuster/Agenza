import { User } from '@/features/auth/domain/entities/User'
import { Tenant } from '@/features/auth/domain/value-objects/Tenant'
import { InvalidSessionError } from '@/features/auth/domain/errors/InvalidSessionError'

interface CreateSessionInput {
  user: User
  accessToken: string
  expiresAt: Date
}

export class Session {
  readonly user: User
  readonly accessToken: string
  readonly expiresAt: Date

  private constructor(user: User, accessToken: string, expiresAt: Date) {
    this.user = user
    this.accessToken = accessToken
    this.expiresAt = expiresAt
  }

  static create(input: CreateSessionInput): Session {
    if (input.accessToken.trim().length === 0) {
      throw new InvalidSessionError('Session access token must not be empty')
    }

    return new Session(input.user, input.accessToken, input.expiresAt)
  }

  isExpiredAt(now: Date): boolean {
    return now.getTime() >= this.expiresAt.getTime()
  }

  belongsToTenant(tenant: Tenant): boolean {
    return this.user.belongsToTenant(tenant)
  }
}
