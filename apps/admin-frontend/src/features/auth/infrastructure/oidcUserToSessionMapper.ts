import type { User as OidcUser } from 'oidc-client-ts'
import { Session } from '@/features/auth/domain/entities/Session'
import { User } from '@/features/auth/domain/entities/User'
import { Tenant } from '@/features/auth/domain/value-objects/Tenant'
import type { InvalidTenantError } from '@/features/auth/domain/errors/InvalidTenantError'
import type { InvalidUserError } from '@/features/auth/domain/errors/InvalidUserError'
import type { InvalidSessionError } from '@/features/auth/domain/errors/InvalidSessionError'
import { MissingTenantClaimError } from '@/features/auth/infrastructure/MissingTenantClaimError'
import { MissingExpiryClaimError } from '@/features/auth/infrastructure/MissingExpiryClaimError'
import { failure, type Result } from '@/shared/application/Result'

export type SessionMappingError =
  | MissingTenantClaimError
  | MissingExpiryClaimError
  | InvalidTenantError
  | InvalidUserError
  | InvalidSessionError

// The one place in the codebase that should know the claim name "tenant_id".
export function mapOidcUserToSession(oidcUser: OidcUser): Result<Session, SessionMappingError> {
  const tenantId = oidcUser.profile.tenant_id

  if (typeof tenantId !== 'string' || tenantId.trim().length === 0) {
    return failure(new MissingTenantClaimError())
  }

  if (oidcUser.expires_at === undefined) {
    return failure(new MissingExpiryClaimError())
  }

  const tenantResult = Tenant.create(tenantId)
  if (!tenantResult.success) {
    return tenantResult
  }

  const userResult = User.create({
    id: oidcUser.profile.sub,
    tenant: tenantResult.value,
    ...(typeof oidcUser.profile.email === 'string' ? { email: oidcUser.profile.email } : {}),
    ...(typeof oidcUser.profile.name === 'string' ? { name: oidcUser.profile.name } : {}),
  })
  if (!userResult.success) {
    return userResult
  }

  return Session.create({
    user: userResult.value,
    accessToken: oidcUser.access_token,
    expiresAt: new Date(oidcUser.expires_at * 1000),
  })
}
