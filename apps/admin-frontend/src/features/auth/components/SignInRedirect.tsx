import { useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';

export function SignInRedirect() {
  const { login } = useAuth();
  const hasStarted = useRef(false);

  useEffect(() => {
    // StrictMode double-invoke guard — a 2nd login() call would race signinRedirect()'s PKCE write.
    if (hasStarted.current) return;
    hasStarted.current = true;
    void login();
  }, [login]);

  return null;
}
