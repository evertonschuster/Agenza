// A missing tenant_id claim means IdentityServer client registration is
// misconfigured - never let a user proceed without a tenant.
export class MissingTenantClaimError extends Error {
  constructor(message = 'The "tenant_id" claim is missing or empty in the token profile') {
    super(message)
    this.name = 'MissingTenantClaimError'
  }
}
