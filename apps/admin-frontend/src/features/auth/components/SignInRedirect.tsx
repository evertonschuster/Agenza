import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

/** The `/login` route: triggers the OIDC redirect to identity-service (contracts/routes-contract.md). */
export function SignInRedirect() {
  const { login } = useAuth();

  useEffect(() => {
    void login();
    // Intentionally runs only once per mount — `login` is stable (useCallback with no deps).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
