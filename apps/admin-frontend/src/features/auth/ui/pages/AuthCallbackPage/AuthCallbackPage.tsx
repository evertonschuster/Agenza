import { Navigate } from 'react-router';
import { useAuthCallback } from './useAuthCallback';

export function AuthCallbackPage() {
  const { failed } = useAuthCallback();

  if (failed) {
    return <Navigate to="/login" replace />;
  }

  return null;
}
