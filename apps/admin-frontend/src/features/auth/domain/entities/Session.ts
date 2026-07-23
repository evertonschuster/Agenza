import { User } from '@/features/auth/domain/entities/User'
import { Tenant } from '@/features/auth/domain/value-objects/Tenant'
import { InvalidSessionError } from '@/features/auth/domain/errors/InvalidSessionError'

interface CreateSessionInput {
  user: User
  accessToken: string
  expiresAt: Date
}

/**
 * Represents an authenticated session for a logged-in user. The
 * accessToken is treated as an opaque credential here - the domain does
 * not need to know it's a JWT, only that it has an expiry.
 *
 * Deliberately does not refresh itself or know about silent renewal:
 * that's an infrastructure/application concern involving timers and
 * retries. The domain's only job is answering "is this session valid at
 * a given point in time".
 */
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

  /**
   * Takes "now" as an explicit parameter rather than reading the system
   * clock internally, so expiry logic is deterministic and testable at
   * exact boundary instants.
   */
  isExpiredAt(now: Date): boolean {
    return now.getTime() >= this.expiresAt.getTime()
  }

  belongsToTenant(tenant: Tenant): boolean {
    return this.user.belongsToTenant(tenant)
  }
}
