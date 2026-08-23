import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from './hooks/useAuth';

/**
 * The single fail-closed guard (spec FR-001, FR-002, FR-009). Every authenticated route —
 * business features included, once they exist — must be nested under this rather than
 * re-implementing the check, so the invariant stays centralized (contracts/routes-contract.md).
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session } = useAuth();

  if (session.status === 'authenticated') {
    return <>{children}</>;
  }

  if (session.status === 'authenticating' || session.status === 'renewing') {
    return null;
  }

  return <Navigate to="/login" replace />;
}
