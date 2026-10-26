import type { User } from 'oidc-client-ts';
import type { SessionPrincipal } from '@/shared/session/session';

export function makeAccessToken(claims: Record<string, unknown>): string {
  const base64url = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${base64url({ alg: 'none' })}.${base64url(claims)}.signature`;
}

export function makeOidcUser(
  overrides: Partial<User> & { tenantId?: string; subject?: string } = {},
): User {
  const { tenantId, subject = 'user-1', ...rest } = overrides;
  return {
    access_token: makeAccessToken(
      tenantId ? { sub: subject, tenant_id: tenantId } : { sub: subject },
    ),
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expired: false,
    profile: { sub: subject, name: 'Demo Owner', email: 'owner@demo.local' },
    ...rest,
  } as User;
}

export function makePrincipal(
  overrides: Partial<SessionPrincipal> & { tenantId?: string } = {},
): SessionPrincipal {
  const { tenantId, subject = 'user-1', ...rest } = overrides;
  return {
    subject,
    accessToken: makeAccessToken(
      tenantId ? { sub: subject, tenant_id: tenantId } : { sub: subject },
    ),
    expiresAt: Date.now() + 3_600_000,
    displayName: 'Demo Owner',
    email: 'owner@demo.local',
    ...rest,
  };
}
