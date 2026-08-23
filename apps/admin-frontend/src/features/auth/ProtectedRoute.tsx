import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { Button } from '@/shared/ui/button';
import { useAuth } from './hooks/useAuth';

// These two failure reasons don't self-resolve by redirecting straight back into another login
// attempt: an unreachable identity-service fails the same way again, and a missing tenant claim
// silently re-authenticates via the identity-service's own SSO session straight back into the
// same claim-less token — looping forever with no user action ever breaking the cycle. Spec Edge
// Case: "identity-service unreachable at login time -> visitor sees a failure state" (spec.md).
// `renewal_failed` is deliberately excluded — spec Edge Case: "silent renewal fails -> user is
// treated as unauthenticated and sent back to login" is a normal expired-session redirect, not a
// loop risk, since the visitor supplies fresh credentials at the identity-service.
const BLOCKING_FAILURE_REASONS = new Set(['identity_unreachable', 'missing_tenant_claim']);

/**
 * The single fail-closed guard (spec FR-001, FR-002, FR-009). Every authenticated route —
 * business features included, once they exist — must be nested under this rather than
 * re-implementing the check, so the invariant stays centralized (contracts/routes-contract.md).
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, login } = useAuth();

  if (session.status === 'authenticated') {
    return <>{children}</>;
  }

  if (session.status === 'checking' || session.status === 'authenticating' || session.status === 'renewing') {
    return null;
  }

  if (session.failureReason && BLOCKING_FAILURE_REASONS.has(session.failureReason)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="font-semibold">Sign-in failed.</p>
        <p className="text-sm text-muted-foreground">Please try signing in again.</p>
        <Button variant="outline" size="sm" onClick={() => void login()}>
          Try again
        </Button>
      </div>
    );
  }

  return <Navigate to="/login" replace />;
}
