export type SessionStatus =
  'checking' | 'unauthenticated' | 'authenticating' | 'authenticated' | 'loggingOut';

export type SessionFailureReason =
  | 'renewal_failed'
  | 'identity_unreachable'
  | 'missing_tenant_claim'
  | 'missing_subject_claim'
  | 'identity_changed';

export interface Session {
  status: SessionStatus;
  subject: string | null;
  accessToken: string | null;
  expiresAt: number | null;
  failureReason: SessionFailureReason | null;
}

export interface SessionPrincipal {
  subject: string;
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
  type:
    | 'login_success'
    | 'login_failure'
    | 'renewal_failure'
    | 'logout'
    | 'missing_tenant_claim'
    | 'identity_changed';
  timestamp: number;
  tenantId: string | null;
}

export const INITIAL_SESSION: Session = {
  status: 'unauthenticated',
  subject: null,
  accessToken: null,
  expiresAt: null,
  failureReason: null,
};
