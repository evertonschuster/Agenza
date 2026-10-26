import { describe, expect, it } from 'vitest';
import { makePrincipal } from '@/test/oidcUser';
import { isBlockingFailure, isTransientStatus, reduceSession } from './sessionMachine';

const TENANT_A = '019f9b0b-e7fb-7ac6-84b7-5c8ed52c6120';
const TENANT_B = '11111111-1111-1111-1111-111111111111';

describe('reduceSession (pure — no React, no identity-provider wiring)', () => {
  it('INITIAL_USER with no stored user -> unauthenticated', () => {
    expect(reduceSession({ type: 'INITIAL_USER', principal: null }).session.status).toBe(
      'unauthenticated',
    );
  });

  it('INITIAL_USER / USER_LOADED with a valid tenant claim -> authenticated (spec FR-005)', () => {
    const result = reduceSession({
      type: 'USER_LOADED',
      principal: makePrincipal({ tenantId: TENANT_A }),
    });
    expect(result.session.status).toBe('authenticated');
    expect(result.tenant).toEqual({ tenantId: TENANT_A });
    expect(result.user).toEqual({ displayName: 'Demo Owner', email: 'owner@demo.local' });
  });

  it('USER_LOADED with a token missing tenant_id -> unauthenticated, missing_tenant_claim (spec FR-009, G2)', () => {
    const result = reduceSession({ type: 'USER_LOADED', principal: makePrincipal() });
    expect(result.session.status).toBe('unauthenticated');
    expect(result.session.failureReason).toBe('missing_tenant_claim');
    expect(result.tenant).toBeNull();
  });

  it('rejects a tenant change before accepting the new credentials', () => {
    const previous = reduceSession({
      type: 'USER_LOADED',
      principal: makePrincipal({ tenantId: TENANT_A }),
    });
    const result = reduceSession(
      {
        type: 'USER_LOADED',
        principal: makePrincipal({ tenantId: TENANT_B }),
      },
      previous,
    );
    expect(result.session).toMatchObject({
      status: 'unauthenticated',
      failureReason: 'identity_changed',
      accessToken: null,
      subject: null,
    });
    expect(result.tenant).toBeNull();
    expect(result.user).toBeNull();
  });

  it('rejects a different subject in the same tenant', () => {
    const previous = reduceSession({
      type: 'USER_LOADED',
      principal: makePrincipal({ tenantId: TENANT_A }),
    });
    const result = reduceSession(
      { type: 'USER_LOADED', principal: makePrincipal({ tenantId: TENANT_A, subject: 'user-2' }) },
      previous,
    );
    expect(result.session.failureReason).toBe('identity_changed');
  });

  it('accepts a renewed token for the same subject and tenant', () => {
    const previous = reduceSession({
      type: 'USER_LOADED',
      principal: makePrincipal({ tenantId: TENANT_A }),
    });
    const principal = makePrincipal({ tenantId: TENANT_A, expiresAt: 99 });
    const result = reduceSession({ type: 'USER_LOADED', principal }, previous);
    expect(result.session.status).toBe('authenticated');
    expect(result.session.expiresAt).toBe(99);
  });

  it('refuses a missing subject', () => {
    expect(
      reduceSession({
        type: 'USER_LOADED',
        principal: makePrincipal({ tenantId: TENANT_A, subject: '' }),
      }).session.failureReason,
    ).toBe('missing_subject_claim');
  });

  it('keeps identity changes blocked across late events until explicit login', () => {
    const principal = makePrincipal({ tenantId: TENANT_A });
    const previous = reduceSession({ type: 'USER_LOADED', principal });
    const blocked = reduceSession(
      { type: 'USER_LOADED', principal: makePrincipal({ tenantId: TENANT_B }) },
      previous,
    );
    for (const event of [
      { type: 'USER_LOADED', principal },
      { type: 'INITIAL_USER', principal },
      { type: 'USER_UNLOADED' },
      { type: 'SILENT_RENEW_ERROR' },
      { type: 'INITIAL_ERROR' },
    ] as const) {
      expect(reduceSession(event, blocked)).toBe(blocked);
    }
    const signingIn = reduceSession({ type: 'LOGIN_STARTED' }, blocked);
    expect(reduceSession({ type: 'USER_LOADED', principal }, signingIn).session.status).toBe(
      'authenticated',
    );
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
    ['missing_subject_claim', true],
    ['identity_changed', true],
    ['renewal_failed', false],
  ] as const)('%s -> %s', (reason, expected) => {
    expect(isBlockingFailure(reason)).toBe(expected);
  });
});

describe('isTransientStatus', () => {
  it.each([
    ['checking', true],
    ['authenticating', true],
    ['loggingOut', true],
    ['unauthenticated', false],
    ['authenticated', false],
  ] as const)('%s -> %s', (status, expected) => {
    expect(isTransientStatus(status)).toBe(expected);
  });
});
