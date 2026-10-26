import { resolveTenantContext, type TenantContext } from './tenant';
import {
  INITIAL_SESSION,
  type AuthenticatedUser,
  type Session,
  type SessionFailureReason,
  type SessionPrincipal,
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
    case 'missing_subject_claim':
    case 'identity_changed':
      return true;
    case 'renewal_failed':
      return false;
  }
}

export function isTransientStatus(status: SessionStatus): boolean {
  switch (status) {
    case 'checking':
    case 'authenticating':
    case 'loggingOut':
      return true;
    case 'unauthenticated':
    case 'authenticated':
      return false;
  }
}

export type SessionEvent =
  | { type: 'INIT' }
  | { type: 'INITIAL_USER'; principal: SessionPrincipal | null }
  | { type: 'INITIAL_ERROR' }
  | { type: 'USER_LOADED'; principal: SessionPrincipal }
  | { type: 'SILENT_RENEW_ERROR' }
  | { type: 'USER_UNLOADED' }
  | { type: 'LOGIN_STARTED' }
  | { type: 'LOGIN_ERROR' }
  | { type: 'LOGOUT_STARTED' };

function resolveAuthenticated(principal: SessionPrincipal): AuthSnapshot {
  if (!principal.subject) {
    return {
      ...INITIAL_SNAPSHOT,
      session: { ...INITIAL_SESSION, failureReason: 'missing_subject_claim' },
    };
  }
  const tenant = resolveTenantContext(principal.accessToken);
  const user: AuthenticatedUser = {
    displayName: principal.displayName,
    email: principal.email,
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
      subject: principal.subject,
      accessToken: principal.accessToken,
      expiresAt: principal.expiresAt,
      failureReason: null,
    },
    tenant,
    user,
  };
}

export function reduceSession(
  event: SessionEvent,
  previous: AuthSnapshot = INITIAL_SNAPSHOT,
): AuthSnapshot {
  if (previous.session.failureReason === 'identity_changed' && event.type !== 'LOGIN_STARTED') {
    return previous;
  }

  if (event.type === 'USER_LOADED' || event.type === 'INITIAL_USER') {
    if (!event.principal) return INITIAL_SNAPSHOT;
    const next = resolveAuthenticated(event.principal);
    if (
      previous.session.status === 'authenticated' &&
      (previous.session.subject !== next.session.subject ||
        previous.tenant?.tenantId !== next.tenant?.tenantId)
    ) {
      return {
        ...INITIAL_SNAPSHOT,
        session: { ...INITIAL_SESSION, failureReason: 'identity_changed' },
      };
    }
    return next;
  }

  switch (event.type) {
    case 'INIT':
      return CHECKING_SNAPSHOT;
    case 'INITIAL_ERROR':
      return {
        ...INITIAL_SNAPSHOT,
        session: { ...INITIAL_SESSION, failureReason: 'identity_unreachable' },
      };
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
