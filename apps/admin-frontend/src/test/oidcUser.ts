import type { User } from 'oidc-client-ts';

export function makeAccessToken(claims: Record<string, unknown>): string {
  const base64url = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${base64url({ alg: 'none' })}.${base64url(claims)}.signature`;
}

export function makeOidcUser(overrides: Partial<User> & { tenantId?: string } = {}): User {
  const { tenantId, ...rest } = overrides;
  return {
    access_token: makeAccessToken(
      tenantId ? { sub: 'user-1', tenant_id: tenantId } : { sub: 'user-1' },
    ),
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expired: false,
    profile: { name: 'Demo Owner', email: 'owner@demo.local' },
    ...rest,
  } as User;
}
