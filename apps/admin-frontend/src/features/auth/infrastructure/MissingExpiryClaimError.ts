// oidc-client-ts's User is missing expires_at - the token response itself
// is malformed, since this is required to determine session validity.
export class MissingExpiryClaimError extends Error {
  constructor(
    message = 'oidc-client-ts User is missing expires_at; cannot determine session validity',
  ) {
    super(message)
    this.name = 'MissingExpiryClaimError'
  }
}
