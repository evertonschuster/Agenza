import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { Button } from '@/shared/ui/button';
import { FullScreenMessage } from '@/shared/ui/FullScreenMessage';
import { useAuth } from './hooks/useAuth';
import { isBlockingFailure, isTransientStatus } from './sessionStore';

// Future authenticated routes must nest under this, not re-implement the check (spec FR-001,
// FR-002, FR-009; contracts/routes-contract.md).
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, login } = useAuth();

  if (session.status === 'authenticated') {
    return <>{children}</>;
  }

  if (isTransientStatus(session.status)) {
    return null;
  }

  if (session.failureReason && isBlockingFailure(session.failureReason)) {
    return (
      <FullScreenMessage
        title="Sign-in failed."
        description="Please try signing in again."
        action={
          <Button variant="outline" size="sm" onClick={() => void login()}>
            Try again
          </Button>
        }
      />
    );
  }

  return <Navigate to="/login" replace />;
}
