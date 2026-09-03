import { logger } from '@/shared/logger';
import { reduceSession, type AuthSnapshot, type SessionEvent } from './sessionMachine';
import type { AuthEvent } from './session';

type Listener = () => void;

function logAuthEvent(type: AuthEvent['type'], tenantId: string | null): void {
  const level = type === 'login_failure' || type === 'renewal_failure' ? 'warn' : 'info';
  logger[level](`auth.${type}`, { tenantId, timestamp: Date.now() });
}

class SessionStore {
  private snapshot: AuthSnapshot = reduceSession({ type: 'INIT' });
  private listeners = new Set<Listener>();

  getSnapshot = (): AuthSnapshot => this.snapshot;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  dispatch(event: SessionEvent): void {
    const prev = this.snapshot;
    const next = reduceSession(event);
    this.snapshot = next;
    this.listeners.forEach((listener) => listener());
    this.runSideEffects(event, prev, next);
  }

  private runSideEffects(event: SessionEvent, prev: AuthSnapshot, next: AuthSnapshot): void {
    const wasAuthenticated = prev.session.status === 'authenticated';
    if (
      event.type === 'USER_LOADED' &&
      next.session.status === 'authenticated' &&
      !wasAuthenticated
    ) {
      logAuthEvent('login_success', next.tenant?.tenantId ?? null);
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
    this.snapshot = reduceSession({ type: 'INIT' });
    this.listeners.clear();
  }
}

export const sessionStore = new SessionStore();

export function getAuthCredentials(): { accessToken: string | null; tenantId: string | null } {
  const { session, tenant } = sessionStore.getSnapshot();
  return { accessToken: session.accessToken, tenantId: tenant?.tenantId ?? null };
}
