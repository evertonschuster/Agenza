import type { User } from 'oidc-client-ts';
import { authClient } from './authClient';
import { resolveTenantContext } from './tenant';
import { logAuthEvent } from './authEvents';
import { INITIAL_SESSION, type AuthenticatedUser, type Session, type TenantContext } from './types';

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

type SessionEvent =
  | { type: 'INITIAL_USER'; user: User | null }
  | { type: 'INITIAL_ERROR' }
  | { type: 'USER_LOADED'; user: User }
  | { type: 'SILENT_RENEW_ERROR' }
  | { type: 'USER_UNLOADED' }
  | { type: 'LOGIN_STARTED' }
  | { type: 'LOGIN_ERROR' };

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

/**
 * The application's session state-transition rules (data-model.md), as a pure function:
 * same event in, same snapshot out, with no React, no `oidc-client-ts` event plumbing, and
 * no side effects. This is the piece that used to live inline inside `AuthProvider`'s
 * `useEffect` — extracting it means the business rules (what should "authenticated" mean,
 * when does a missing tenant claim fail closed, when does a renewal failure reset the
 * session) are testable as plain function calls, independent of how they're wired to the UI.
 */
export function reduceSession(event: SessionEvent): AuthSnapshot {
  switch (event.type) {
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
  }
}

type Listener = () => void;

/**
 * The external store `useSyncExternalStore` subscribes to (AuthProvider.tsx). A singleton
 * because there is exactly one session for the whole app — not a per-subtree concern.
 * Wraps `oidc-client-ts`'s event emitter (infrastructure) and dispatches through the pure
 * `reduceSession` (application logic) above; logging side effects happen here, at the
 * boundary, not inside the reducer.
 */
class SessionStore {
  private snapshot: AuthSnapshot = INITIAL_SNAPSHOT;
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

  private handleUserLoaded = (user: User): void => {
    this.dispatch({ type: 'USER_LOADED', user });
  };

  private handleSilentRenewError = (): void => {
    this.dispatch({ type: 'SILENT_RENEW_ERROR' });
  };

  private handleUserUnloaded = (): void => {
    this.dispatch({ type: 'USER_UNLOADED' });
  };

  /** Registers with `oidc-client-ts` and kicks off the initial session check. Called once from `AuthProvider`'s mount effect. */
  startListening(): () => void {
    authClient.events.addUserLoaded(this.handleUserLoaded);
    authClient.events.addSilentRenewError(this.handleSilentRenewError);
    authClient.events.addUserUnloaded(this.handleUserUnloaded);

    authClient
      .getUser()
      .then((user) => this.dispatch({ type: 'INITIAL_USER', user }))
      .catch(() => this.dispatch({ type: 'INITIAL_ERROR' }));

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
    await authClient.signoutRedirect();
  }

  /** Test-only: not called by production code. */
  reset(): void {
    this.snapshot = INITIAL_SNAPSHOT;
    this.listeners.clear();
  }
}

export const sessionStore = new SessionStore();
