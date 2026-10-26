import { logger } from '@/shared/logger';
import { reduceSession, type AuthSnapshot, type SessionEvent } from './sessionMachine';
import type { AuthEvent } from './session';

type Listener = () => void;

function logAuthEvent(type: AuthEvent['type'], tenantId: string | null): void {
  const level =
    type === 'login_failure' ||
    type === 'renewal_failure' ||
    type === 'missing_tenant_claim' ||
    type === 'identity_changed'
      ? 'warn'
      : 'info';
  logger[level](`auth.${type}`, { tenantId, timestamp: Date.now() });
}

class SessionStore {
  private snapshot: AuthSnapshot = reduceSession({ type: 'INIT' });
  private requests = new AbortController();
  private listeners = new Set<Listener>();

  getSnapshot = (): AuthSnapshot => this.snapshot;
  getRequestSignal = (): AbortSignal => this.requests.signal;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  dispatch(event: SessionEvent): void {
    const prev = this.snapshot;
    const next = reduceSession(event, prev);
    this.snapshot = next;
    if (prev.session.status === 'authenticated' && next.session.status !== 'authenticated') {
      this.requests.abort();
    }
    if (next.session.status === 'authenticated' && this.requests.signal.aborted) {
      this.requests = new AbortController();
    }
    this.listeners.forEach((listener) => listener());
    this.runSideEffects(event, prev, next);
  }

  private runSideEffects(event: SessionEvent, prev: AuthSnapshot, next: AuthSnapshot): void {
    if (
      next.session.failureReason === 'identity_changed' &&
      prev.session.failureReason !== 'identity_changed'
    ) {
      logAuthEvent('identity_changed', prev.tenant?.tenantId ?? null);
    }
    const wasAuthenticated = prev.session.status === 'authenticated';
    if (
      event.type === 'USER_LOADED' &&
      next.session.status === 'authenticated' &&
      !wasAuthenticated
    ) {
      logAuthEvent('login_success', next.tenant?.tenantId ?? null);
    }
    if (
      (event.type === 'USER_LOADED' || event.type === 'INITIAL_USER') &&
      next.session.failureReason === 'missing_tenant_claim'
    ) {
      logAuthEvent('missing_tenant_claim', prev.tenant?.tenantId ?? null);
    }
    if (event.type === 'SILENT_RENEW_ERROR') {
      logAuthEvent('renewal_failure', prev.tenant?.tenantId ?? null);
    }
    if (event.type === 'LOGIN_ERROR') {
      logAuthEvent('login_failure', null);
    }
    if (event.type === 'LOGOUT_STARTED') {
      logAuthEvent('logout', prev.tenant?.tenantId ?? null);
    }
  }

  // test-only
  reset(): void {
    this.requests.abort();
    this.requests = new AbortController();
    this.snapshot = reduceSession({ type: 'INIT' });
    this.listeners.clear();
  }
}

export const sessionStore = new SessionStore();

export function getAuthCredentials(): {
  accessToken: string | null;
  tenantId: string | null;
  signal: AbortSignal;
} {
  const { session, tenant } = sessionStore.getSnapshot();
  return {
    accessToken: session.accessToken,
    tenantId: tenant?.tenantId ?? null,
    signal: sessionStore.getRequestSignal(),
  };
}
