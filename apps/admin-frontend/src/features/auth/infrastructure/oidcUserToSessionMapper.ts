import type { User as OidcUser } from 'oidc-client-ts'
import { Session } from '@/features/auth/domain/entities/Session'
import { User } from '@/features/auth/domain/entities/User'
import { Tenant } from '@/features/auth/domain/value-objects/Tenant'
import { MissingTenantClaimError } from '@/features/auth/infrastructure/MissingTenantClaimError'

// The one place in the codebase that should know the claim name "tenant_id".
export function mapOidcUserToSession(oidcUser: OidcUser): Session {
  const tenantId = oidcUser.profile.tenant_id

  if (typeof tenantId !== 'string' || tenantId.trim().length === 0) {
    throw new MissingTenantClaimError()
  }

  if (oidcUser.expires_at === undefined) {
    throw new Error('oidc-client-ts User is missing expires_at; cannot determine session validity')
  }

  const tenant = Tenant.create(tenantId)
  const user = User.create({
    id: oidcUser.profile.sub,
    tenant,
    ...(typeof oidcUser.profile.email === 'string' ? { email: oidcUser.profile.email } : {}),
    ...(typeof oidcUser.profile.name === 'string' ? { name: oidcUser.profile.name } : {}),
  })

  return Session.create({
    user,
    accessToken: oidcUser.access_token,
    expiresAt: new Date(oidcUser.expires_at * 1000),
  })
}
