import { useEffect, useRef } from 'react';
import { useAuth } from '../../useAuth';

export function useLoginRedirect(): void {
  const { login } = useAuth();
  const hasStarted = useRef(false);

  useEffect(() => {
    // StrictMode double-invoke guard: a 2nd login() would race signinRedirect()'s PKCE write
    if (hasStarted.current) return;
    hasStarted.current = true;
    void login();
  }, [login]);
}
