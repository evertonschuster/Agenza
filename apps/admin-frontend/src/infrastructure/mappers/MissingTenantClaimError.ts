/**
 * Thrown when an oidc-client-ts User's claims are missing a usable
 * tenant_id. This is a serious, unexpected condition - it means either
 * the IdentityServer client registration is misconfigured (wrong scope,
 * claim not mapped) or something is generating tokens without tenant
 * context. A user must never be allowed to proceed without a tenant.
 */
export class MissingTenantClaimError extends Error {
  constructor(message = 'The "tenant_id" claim is missing or empty in the token profile') {
    super(message)
    this.name = 'MissingTenantClaimError'
  }
}
