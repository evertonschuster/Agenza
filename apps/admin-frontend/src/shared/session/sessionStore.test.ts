import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makePrincipal } from '@/test/oidcUser';
import { logger } from '@/shared/logger';
import { getAuthCredentials, sessionStore } from './sessionStore';

const TENANT = '019f9b0b-e7fb-7ac6-84b7-5c8ed52c6120';

describe('sessionStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStore.reset();
  });

  describe('dispatch', () => {
    it('replaces the snapshot and notifies every subscriber', () => {
      const first = vi.fn();
      const second = vi.fn();
      sessionStore.subscribe(first);
      sessionStore.subscribe(second);

      sessionStore.dispatch({
        type: 'USER_LOADED',
        principal: makePrincipal({ tenantId: TENANT }),
      });

      expect(sessionStore.getSnapshot().session.status).toBe('authenticated');
      expect(first).toHaveBeenCalledTimes(1);
      expect(second).toHaveBeenCalledTimes(1);
    });
  });

  describe('subscribe', () => {
    it('returns an unsubscribe that stops further notifications', () => {
      const listener = vi.fn();
      const unsubscribe = sessionStore.subscribe(listener);

      sessionStore.dispatch({ type: 'LOGIN_STARTED' });
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      sessionStore.dispatch({ type: 'USER_UNLOADED' });
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('auth event log', () => {
    const NOW = Date.parse('2026-09-03T12:00:00.000Z');

    beforeEach(() => {
      vi.useFakeTimers({ now: NOW });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('logs login_success when a user loads into an authenticated session', () => {
      sessionStore.dispatch({
        type: 'USER_LOADED',
        principal: makePrincipal({ tenantId: TENANT }),
      });

      expect(logger.info).toHaveBeenCalledWith('auth.login_success', {
        tenantId: TENANT,
        timestamp: NOW,
      });
    });

    it('logs renewal_failure on a silent renew error', () => {
      sessionStore.dispatch({ type: 'SILENT_RENEW_ERROR' });

      expect(logger.warn).toHaveBeenCalledWith('auth.renewal_failure', {
        tenantId: null,
        timestamp: NOW,
      });
    });

    it('logs login_failure on a login error', () => {
      sessionStore.dispatch({ type: 'LOGIN_ERROR' });

      expect(logger.warn).toHaveBeenCalledWith('auth.login_failure', {
        tenantId: null,
        timestamp: NOW,
      });
    });

    it('logs logout with the outgoing tenant when a sign-out starts', () => {
      sessionStore.dispatch({
        type: 'USER_LOADED',
        principal: makePrincipal({ tenantId: TENANT }),
      });
      vi.clearAllMocks();

      sessionStore.dispatch({ type: 'LOGOUT_STARTED' });

      expect(logger.info).toHaveBeenCalledWith('auth.logout', {
        tenantId: TENANT,
        timestamp: NOW,
      });
    });

    it('does not re-log login_success for a repeat USER_LOADED on an already-authenticated session', () => {
      const principal = makePrincipal({ tenantId: TENANT });
      sessionStore.dispatch({ type: 'USER_LOADED', principal });
      vi.clearAllMocks();

      sessionStore.dispatch({ type: 'USER_LOADED', principal });

      expect(logger.info).not.toHaveBeenCalled();
    });
  });

  describe('getAuthCredentials', () => {
    it('returns nulls when there is no authenticated session', () => {
      expect(getAuthCredentials()).toEqual({ accessToken: null, tenantId: null });
    });

    it('reports the live access token and tenant once the session is authenticated', () => {
      const principal = makePrincipal({ tenantId: 'tenant-abc' });

      sessionStore.dispatch({ type: 'USER_LOADED', principal });

      expect(getAuthCredentials()).toEqual({
        accessToken: principal.accessToken,
        tenantId: 'tenant-abc',
      });
    });
  });

  describe('reset', () => {
    it('returns the snapshot to the store’s initial checking state and drops subscribers', () => {
      const listener = vi.fn();
      sessionStore.subscribe(listener);
      sessionStore.dispatch({
        type: 'USER_LOADED',
        principal: makePrincipal({ tenantId: TENANT }),
      });
      expect(sessionStore.getSnapshot().session.status).toBe('authenticated');

      sessionStore.reset();

      expect(sessionStore.getSnapshot()).toEqual({
        session: { status: 'checking', accessToken: null, expiresAt: null, failureReason: null },
        tenant: null,
        user: null,
      });
      expect(getAuthCredentials()).toEqual({ accessToken: null, tenantId: null });

      listener.mockClear();
      sessionStore.dispatch({ type: 'LOGIN_STARTED' });
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
