import { describe, expect, it } from 'vitest';
import type { User } from 'oidc-client-ts';
import { isBlockingFailure, isTransientStatus, reduceSession } from './sessionMachine';

function makeAccessToken(claims: Record<string, unknown>): string {
  const base64url = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${base64url({ alg: 'none' })}.${base64url(claims)}.signature`;
}

function makeOidcUser(overrides: Partial<User> & { tenantId?: string } = {}): User {
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

const TENANT_A = '019f9b0b-e7fb-7ac6-84b7-5c8ed52c6120';
const TENANT_B = '11111111-1111-1111-1111-111111111111';

describe('reduceSession (pure — no React, no oidc-client-ts wiring)', () => {
  it('INITIAL_USER with no stored user -> unauthenticated', () => {
    expect(reduceSession({ type: 'INITIAL_USER', user: null }).session.status).toBe(
      'unauthenticated',
    );
  });

  it('INITIAL_USER with an expired stored user -> unauthenticated (fail closed)', () => {
    const result = reduceSession({
      type: 'INITIAL_USER',
      user: makeOidcUser({ expired: true, tenantId: TENANT_A }),
    });
    expect(result.session.status).toBe('unauthenticated');
  });

  it('INITIAL_USER / USER_LOADED with a valid tenant claim -> authenticated (spec FR-005)', () => {
    const result = reduceSession({
      type: 'USER_LOADED',
      user: makeOidcUser({ tenantId: TENANT_A }),
    });
    expect(result.session.status).toBe('authenticated');
    expect(result.tenant).toEqual({ tenantId: TENANT_A });
    expect(result.user).toEqual({ displayName: 'Demo Owner', email: 'owner@demo.local' });
  });

  it('USER_LOADED with a token missing tenant_id -> unauthenticated, missing_tenant_claim (spec FR-009, G2)', () => {
    const result = reduceSession({ type: 'USER_LOADED', user: makeOidcUser() });
    expect(result.session.status).toBe('unauthenticated');
    expect(result.session.failureReason).toBe('missing_tenant_claim');
    expect(result.tenant).toBeNull();
  });

  it('USER_LOADED with a changed tenant_id re-resolves Tenant Context to the new value (spec Edge Case, G3)', () => {
    const result = reduceSession({
      type: 'USER_LOADED',
      user: makeOidcUser({ tenantId: TENANT_B }),
    });
    expect(result.tenant).toEqual({ tenantId: TENANT_B });
  });

  it('INITIAL_ERROR -> unauthenticated, identity_unreachable (spec Edge Case, G1)', () => {
    const result = reduceSession({ type: 'INITIAL_ERROR' });
    expect(result.session.status).toBe('unauthenticated');
    expect(result.session.failureReason).toBe('identity_unreachable');
  });

  it('LOGIN_ERROR -> unauthenticated, identity_unreachable (spec Edge Case, G1)', () => {
    const result = reduceSession({ type: 'LOGIN_ERROR' });
    expect(result.session.failureReason).toBe('identity_unreachable');
  });

  it('SILENT_RENEW_ERROR -> unauthenticated, renewal_failed (spec FR-009)', () => {
    const result = reduceSession({ type: 'SILENT_RENEW_ERROR' });
    expect(result.session.status).toBe('unauthenticated');
    expect(result.session.failureReason).toBe('renewal_failed');
  });

  it('USER_UNLOADED -> unauthenticated, clears tenant and user (logout, spec FR-008)', () => {
    const result = reduceSession({ type: 'USER_UNLOADED' });
    expect(result.session.status).toBe('unauthenticated');
    expect(result.tenant).toBeNull();
    expect(result.user).toBeNull();
  });

  it('LOGIN_STARTED -> authenticating', () => {
    expect(reduceSession({ type: 'LOGIN_STARTED' }).session.status).toBe('authenticating');
  });

  it('LOGOUT_STARTED -> loggingOut', () => {
    expect(reduceSession({ type: 'LOGOUT_STARTED' }).session.status).toBe('loggingOut');
  });

  it('INIT -> checking', () => {
    expect(reduceSession({ type: 'INIT' }).session.status).toBe('checking');
  });
});

describe('isBlockingFailure', () => {
  it.each([
    ['identity_unreachable', true],
    ['missing_tenant_claim', true],
    ['renewal_failed', false],
  ] as const)('%s -> %s', (reason, expected) => {
    expect(isBlockingFailure(reason)).toBe(expected);
  });
});

describe('isTransientStatus', () => {
  it.each([
    ['checking', true],
    ['authenticating', true],
    ['renewing', true],
    ['loggingOut', true],
    ['unauthenticated', false],
    ['authenticated', false],
  ] as const)('%s -> %s', (status, expected) => {
    expect(isTransientStatus(status)).toBe(expected);
  });
});
