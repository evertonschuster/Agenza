import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { Button } from '@/shared/ui/button';
import { FullScreenMessage } from '@/shared/ui/FullScreenMessage';
import { useAuth } from './hooks/useAuth';
import { isBlockingFailure, isTransientStatus } from '../domain/sessionMachine';

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
        title="Falha ao entrar."
        description="Tente entrar novamente."
        action={
          <Button variant="outline" size="sm" onClick={() => void login()}>
            Tentar novamente
          </Button>
        }
      />
    );
  }

  return <Navigate to="/login" replace />;
}
