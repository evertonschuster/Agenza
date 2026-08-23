import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { authClient } from '../authClient';

/** The `/callback` route: completes `signinCallback()`, then navigates to `/` (contracts/routes-contract.md). */
export function LoginRedirect() {
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
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
