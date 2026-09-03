export type SessionStatus =
  'checking' | 'unauthenticated' | 'authenticating' | 'authenticated' | 'renewing' | 'loggingOut';

export type SessionFailureReason =
  'renewal_failed' | 'identity_unreachable' | 'missing_tenant_claim';

export interface Session {
  status: SessionStatus;
  accessToken: string | null;
  expiresAt: number | null;
  failureReason: SessionFailureReason | null;
}

export interface SessionPrincipal {
  accessToken: string;
  expiresAt: number | null;
  displayName: string | null;
  email: string | null;
}

export interface AuthenticatedUser {
  displayName: string | null;
  email: string | null;
}

export interface AuthEvent {
  type: 'login_success' | 'login_failure' | 'renewal_failure' | 'logout';
  timestamp: number;
  tenantId: string | null;
}

export const INITIAL_SESSION: Session = {
  status: 'unauthenticated',
  accessToken: null,
  expiresAt: null,
  failureReason: null,
};
