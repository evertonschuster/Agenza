import type { User } from 'oidc-client-ts';
import { logger } from '@/shared/logger';
import { authClient } from '../api/authClient';
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

  private dispatch(event: SessionEvent): void {
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
  }

  // A silent renewal or the initial getUser() can resolve after logout() has already dispatched
  // LOGOUT_STARTED; without this guard the late one overwrites 'loggingOut' and fights
  // signoutRedirect()'s own navigation.
  private get isLoggingOut(): boolean {
    return this.snapshot.session.status === 'loggingOut';
  }

  private handleUserLoaded = (user: User): void => {
    if (this.isLoggingOut) return;
    this.dispatch({ type: 'USER_LOADED', user });
  };

  private handleSilentRenewError = (): void => {
    if (this.isLoggingOut) return;
    this.dispatch({ type: 'SILENT_RENEW_ERROR' });
  };

  private handleUserUnloaded = (): void => {
    if (this.isLoggingOut) return;
    this.dispatch({ type: 'USER_UNLOADED' });
  };

  startListening(): () => void {
    authClient.events.addUserLoaded(this.handleUserLoaded);
    authClient.events.addSilentRenewError(this.handleSilentRenewError);
    authClient.events.addUserUnloaded(this.handleUserUnloaded);

    authClient
      .getUser()
      .then((user) => {
        if (this.isLoggingOut) return;
        this.dispatch({ type: 'INITIAL_USER', user });
      })
      .catch(() => {
        if (this.isLoggingOut) return;
        this.dispatch({ type: 'INITIAL_ERROR' });
      });

    return () => {
      authClient.events.removeUserLoaded(this.handleUserLoaded);
      authClient.events.removeSilentRenewError(this.handleSilentRenewError);
      authClient.events.removeUserUnloaded(this.handleUserUnloaded);
    };
  }

  async login(): Promise<void> {
    this.dispatch({ type: 'LOGIN_STARTED' });
    try {
      await authClient.signinRedirect();
    } catch {
      this.dispatch({ type: 'LOGIN_ERROR' });
    }
  }

  async logout(): Promise<void> {
    logAuthEvent('logout', this.snapshot.tenant?.tenantId ?? null);
    this.dispatch({ type: 'LOGOUT_STARTED' });
    try {
      await authClient.signoutRedirect();
    } catch {
      this.dispatch({ type: 'USER_UNLOADED' });
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
