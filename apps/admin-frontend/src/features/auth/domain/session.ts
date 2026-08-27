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

export const INITIAL_SESSION: Session = {
  status: 'unauthenticated',
  accessToken: null,
  expiresAt: null,
  failureReason: null,
};
