import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { authClient } from '../../../infrastructure/authClient';

/** Drives the `/callback` route: completes the OIDC code exchange once per mount, then sends the
 * visitor to `/`. Exposes `failed` so the page can redirect back to `/login` on error.
 * StrictMode double-invoke guard — a 2nd signinCallback() call would redeem the single-use code twice. */
export function useAuthCallback(): { failed: boolean } {
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);
  const hasStarted = useRef(false);

  useEffect(() => {
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

  return { failed };
}
