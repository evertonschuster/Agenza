import { Navigate } from 'react-router';
import { useAuthCallback } from './useAuthCallback';

/** `/callback` route — the OIDC redirect target. Renders nothing on the happy path (the hook
 * navigates to `/`); falls back to `/login` if the code exchange fails. */
export function AuthCallbackPage() {
  const { failed } = useAuthCallback();

  if (failed) {
    return <Navigate to="/login" replace />;
  }

  return null;
}
