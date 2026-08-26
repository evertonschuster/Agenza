import type { User } from 'oidc-client-ts';
import { authClient } from './authClient';
import { resolveTenantContext } from './tenant';
import { logAuthEvent } from './authEvents';
import {
  INITIAL_SESSION,
  type AuthenticatedUser,
  type Session,
  type SessionFailureReason,
  type SessionStatus,
  type TenantContext,
} from './types';

export interface AuthSnapshot {
  session: Session;
  tenant: TenantContext | null;
  user: AuthenticatedUser | null;
}

export const INITIAL_SNAPSHOT: AuthSnapshot = {
  session: INITIAL_SESSION,
  tenant: null,
  user: null,
};

/** Distinct from INITIAL_SNAPSHOT ('unauthenticated') — must stay transient or a valid
 * stored session gets redirected before the check finds it. */
const CHECKING_SNAPSHOT: AuthSnapshot = {
  ...INITIAL_SNAPSHOT,
  session: { ...INITIAL_SESSION, status: 'checking' },
};

/** identity_unreachable and missing_tenant_claim loop forever if auto-redirected (SSO
 * silently retries into the same failure); renewal_failed doesn't. No `default`. */
export function isBlockingFailure(reason: SessionFailureReason): boolean {
  switch (reason) {
    case 'identity_unreachable':
    case 'missing_tenant_claim':
      return true;
    case 'renewal_failed':
      return false;
  }
}

/** No `default` — same reason as `isBlockingFailure`. */
export function isTransientStatus(status: SessionStatus): boolean {
  switch (status) {
    case 'checking':
    case 'authenticating':
    case 'renewing':
    case 'loggingOut':
      return true;
    case 'unauthenticated':
    case 'authenticated':
      return false;
  }
}

type SessionEvent =
  | { type: 'INIT' }
  | { type: 'INITIAL_USER'; user: User | null }
  | { type: 'INITIAL_ERROR' }
  | { type: 'USER_LOADED'; user: User }
  | { type: 'SILENT_RENEW_ERROR' }
  | { type: 'USER_UNLOADED' }
  | { type: 'LOGIN_STARTED' }
  | { type: 'LOGIN_ERROR' }
  | { type: 'LOGOUT_STARTED' };

function resolveAuthenticated(oidcUser: User): AuthSnapshot {
  const tenant = resolveTenantContext(oidcUser.access_token);
  const user: AuthenticatedUser = {
    displayName: typeof oidcUser.profile.name === 'string' ? oidcUser.profile.name : null,
    email: typeof oidcUser.profile.email === 'string' ? oidcUser.profile.email : null,
  };

  if (!tenant) {
    return {
      session: { ...INITIAL_SESSION, failureReason: 'missing_tenant_claim' },
      tenant: null,
      user,
    };
  }

  return {
    session: {
      status: 'authenticated',
      accessToken: oidcUser.access_token,
      expiresAt: oidcUser.expires_at ? oidcUser.expires_at * 1000 : null,
      failureReason: null,
    },
    tenant,
    user,
  };
}

// See data-model.md for the full transition table.
export function reduceSession(event: SessionEvent): AuthSnapshot {
  switch (event.type) {
    case 'INIT':
      return CHECKING_SNAPSHOT;
    case 'INITIAL_USER':
      if (!event.user || event.user.expired) {
        return INITIAL_SNAPSHOT;
      }
      return resolveAuthenticated(event.user);
    case 'INITIAL_ERROR':
      return {
        ...INITIAL_SNAPSHOT,
        session: { ...INITIAL_SESSION, failureReason: 'identity_unreachable' },
      };
    case 'USER_LOADED':
      return resolveAuthenticated(event.user);
    case 'SILENT_RENEW_ERROR':
      return {
        ...INITIAL_SNAPSHOT,
        session: { ...INITIAL_SESSION, failureReason: 'renewal_failed' },
      };
    case 'USER_UNLOADED':
      return INITIAL_SNAPSHOT;
    case 'LOGIN_STARTED':
      return { ...INITIAL_SNAPSHOT, session: { ...INITIAL_SESSION, status: 'authenticating' } };
    case 'LOGIN_ERROR':
      return {
        ...INITIAL_SNAPSHOT,
        session: { ...INITIAL_SESSION, failureReason: 'identity_unreachable' },
      };
    case 'LOGOUT_STARTED':
      return { ...INITIAL_SNAPSHOT, session: { ...INITIAL_SESSION, status: 'loggingOut' } };
  }
}

type Listener = () => void;

// Side effects (logAuthEvent) happen here, at the boundary — never inside reduceSession.
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

  // A silent renewal or the initial getUser() can still resolve after logout() has already
  // dispatched LOGOUT_STARTED — without this guard, whichever settles last would overwrite
  // 'loggingOut' and could send ProtectedRoute into a redirect that fights signoutRedirect()'s
  // own navigation.
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
      // User is already cleared even though this failed — move off 'loggingOut' so retry works.
      this.dispatch({ type: 'USER_UNLOADED' });
    }
  }

  /** Test-only. */
  reset(): void {
    this.snapshot = reduceSession({ type: 'INIT' });
    this.listeners.clear();
  }
}

export const sessionStore = new SessionStore();
