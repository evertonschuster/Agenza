import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { authClient } from '../../../api/authClient';

export function useAuthCallback(): { failed: boolean } {
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);
  const hasStarted = useRef(false);

  useEffect(() => {
    // StrictMode double-invoke guard: a 2nd signinCallback() redeems the single-use code twice
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
