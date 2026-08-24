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

/**
 * The store's snapshot before the initial `authClient.getUser()` check has resolved — distinct
 * from `INITIAL_SNAPSHOT` ('unauthenticated'), which means "checked, definitely no session."
 * `ProtectedRoute` must treat 'checking' like 'authenticating'/'renewing' (render nothing yet),
 * never as a reason to redirect — otherwise every page load/refresh redirects into a login
 * round-trip even when a valid session is already in storage, because the redirect fires before
 * the async check has a chance to find it.
 */
const CHECKING_SNAPSHOT: AuthSnapshot = {
  ...INITIAL_SNAPSHOT,
  session: { ...INITIAL_SESSION, status: 'checking' },
};

/**
 * Whether `ProtectedRoute` should show a "sign-in failed, try again" screen instead of
 * redirecting straight back to `/login` (spec Edge Cases, spec.md). `identity_unreachable` and
 * `missing_tenant_claim` don't self-resolve by redirecting again: an unreachable identity-service
 * fails the same way again, and a missing tenant claim silently re-authenticates via the
 * identity-service's own SSO session straight back into the same claim-less token — looping
 * forever with no user action ever breaking the cycle. `renewal_failed` is a normal
 * expired-session redirect, not a loop risk, since the visitor supplies fresh credentials at the
 * identity-service. No `default` case, so adding a `SessionFailureReason` later forces a
 * conscious choice here instead of silently defaulting to "auto-redirect."
 */
export function isBlockingFailure(reason: SessionFailureReason): boolean {
  switch (reason) {
    case 'identity_unreachable':
    case 'missing_tenant_claim':
      return true;
    case 'renewal_failed':
      return false;
  }
}

/** Whether `ProtectedRoute` should render nothing yet (an async transition is in flight) rather than deciding to show the route or redirect. No `default`, for the same reason as `isBlockingFailure`. */
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

/**
 * The external store `useSyncExternalStore` subscribes to (AuthProvider.tsx). A singleton
 * because there is exactly one session for the whole app — not a per-subtree concern.
 * Wraps `oidc-client-ts`'s event emitter (infrastructure) and dispatches through the pure
 * `reduceSession` (application logic) above; logging side effects happen here, at the
 * boundary, not inside the reducer.
 */
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

  private handleUserLoaded = (user: User): void => {
    this.dispatch({ type: 'USER_LOADED', user });
  };

  private handleSilentRenewError = (): void => {
    this.dispatch({ type: 'SILENT_RENEW_ERROR' });
  };

  private handleUserUnloaded = (): void => {
    // oidc-client-ts's `signoutRedirect()` clears the local user (firing `UserUnloaded`)
    // *before* it navigates the browser to identity-service's end-session endpoint. Reacting to
    // it while `logout()` already has that redirect in flight (status 'loggingOut') used to
    // send `ProtectedRoute` to `/login`, which immediately fired its own `signinRedirect()` — a
    // second browser navigation racing the real sign-out redirect. Whichever won, the visitor
    // was bounced through an unpredictable extra hop instead of a straightforward logout.
    if (this.snapshot.session.status === 'loggingOut') return;
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
    this.dispatch({ type: 'LOGOUT_STARTED' });
    try {
      await authClient.signoutRedirect();
    } catch {
      // signoutRedirect() already cleared the local user before it failed here (see
      // handleUserUnloaded's comment) — reflect that instead of leaving the UI stuck on
      // 'loggingOut' with no way to retry.
      this.dispatch({ type: 'USER_UNLOADED' });
    }
  }

  /** Test-only: not called by production code. */
  reset(): void {
    this.snapshot = reduceSession({ type: 'INIT' });
    this.listeners.clear();
  }
}

export const sessionStore = new SessionStore();
