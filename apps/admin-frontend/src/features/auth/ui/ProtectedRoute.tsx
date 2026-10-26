import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { Button } from '@/shared/ui/button';
import { FullScreenMessage } from '@/shared/ui/FullScreenMessage';
import { useAuth } from './useAuth';
import { isBlockingFailure, isTransientStatus } from '@/shared/session/sessionMachine';

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
        title={
          session.failureReason === 'identity_changed' ? 'Sua sessão mudou.' : 'Falha ao entrar.'
        }
        description={
          session.failureReason === 'identity_changed'
            ? 'Entre novamente para continuar.'
            : 'Tente entrar novamente.'
        }
        action={
          <Button variant="outline" size="sm" onClick={() => void login()}>
            {session.failureReason === 'identity_changed' ? 'Entrar novamente' : 'Tentar novamente'}
          </Button>
        }
      />
    );
  }

  return <Navigate to="/login" replace />;
}
