import { useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';

/** The `/login` route: triggers the OIDC redirect to identity-service (contracts/routes-contract.md). */
export function SignInRedirect() {
  const { login } = useAuth();
  const hasStarted = useRef(false);

  useEffect(() => {
    // Guards against StrictMode's dev-only double-invoke of this effect (mount -> cleanup ->
    // mount). Without it, `login()` fires twice: `signinRedirect()` writes PKCE state/verifier
    // to storage before navigating, so two concurrent calls race, and the second call's stored
    // state can be overwritten before the browser actually navigates on the first — breaking
    // `signinCallback()`'s state/nonce validation on `/callback`.
    if (hasStarted.current) return;
    hasStarted.current = true;
    void login();
  }, [login]);

  return null;
}
