import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { authClient } from '../authClient';

/** The `/callback` route: completes `signinCallback()`, then navigates to `/` (contracts/routes-contract.md). */
export function LoginRedirect() {
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);
  const hasStarted = useRef(false);

  useEffect(() => {
    // Guards against StrictMode's dev-only double-invoke of this effect. The authorization code
    // in the URL is single-use — a second concurrent `signinCallback()` call redeems an
    // already-consumed code and rejects, racing the first call's success and sometimes bouncing
    // straight back to /login right after a successful login.
    if (hasStarted.current) return;
    hasStarted.current = true;

    void authClient
      .signinCallback()
      .then(() => {
        void navigate('/', { replace: true });
      })
      .catch(() => {
        setFailed(true);
      });
  }, [navigate]);

  if (failed) {
    return <Navigate to="/login" replace />;
  }

  return null;
}
