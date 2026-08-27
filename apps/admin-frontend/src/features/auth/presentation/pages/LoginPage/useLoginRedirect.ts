import { useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';

/** Drives the `/login` route: triggers the OIDC sign-in redirect once per mount.
 * StrictMode double-invoke guard — a 2nd login() call would race signinRedirect()'s PKCE write. */
export function useLoginRedirect(): void {
  const { login } = useAuth();
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    void login();
  }, [login]);
}
