import { describe, expect, it } from 'vitest';
import { resolveTenantContext } from './tenant';

function makeAccessToken(claims: Record<string, unknown>): string {
  const base64url = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${base64url({ alg: 'none' })}.${base64url(claims)}.signature`;
}

describe('resolveTenantContext', () => {
  it('resolves the tenant from the token tenant_id claim (spec FR-005)', () => {
    const token = makeAccessToken({
      sub: 'user-1',
      tenant_id: '019f9b0b-e7fb-7ac6-84b7-5c8ed52c6120',
    });

    expect(resolveTenantContext(token)).toEqual({
      tenantId: '019f9b0b-e7fb-7ac6-84b7-5c8ed52c6120',
    });
  });

  it('returns null when the claim is missing, regardless of any client-supplied tenant hint (spec FR-006)', () => {
    // `resolveTenantContext` takes only the access token as input — a URL query string,
    // route param, or localStorage value is never even a parameter it could read, by
    // construction. This test documents that invariant explicitly rather than leaving it
    // merely implicit in the function signature.
    const token = makeAccessToken({ sub: 'user-1' });

    expect(resolveTenantContext(token)).toBeNull();
  });

  it('returns null for a null access token', () => {
    expect(resolveTenantContext(null)).toBeNull();
  });

  it('returns null for a malformed token', () => {
    expect(resolveTenantContext('not-a-jwt')).toBeNull();
  });
});
