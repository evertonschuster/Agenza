import type { User } from 'oidc-client-ts';
import { resolveTenantContext, type TenantContext } from './tenant';
import {
  INITIAL_SESSION,
  type AuthenticatedUser,
  type Session,
  type SessionFailureReason,
  type SessionStatus,
} from './session';

export interface AuthSnapshot {
  session: Session;
  tenant: TenantContext | null;
  user: AuthenticatedUser | null;
}

const INITIAL_SNAPSHOT: AuthSnapshot = {
  session: INITIAL_SESSION,
  tenant: null,
  user: null,
};

const CHECKING_SNAPSHOT: AuthSnapshot = {
  ...INITIAL_SNAPSHOT,
  session: { ...INITIAL_SESSION, status: 'checking' },
};

export function isBlockingFailure(reason: SessionFailureReason): boolean {
  switch (reason) {
    case 'identity_unreachable':
    case 'missing_tenant_claim':
      return true;
    case 'renewal_failed':
      return false;
  }
}

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

export type SessionEvent =
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
