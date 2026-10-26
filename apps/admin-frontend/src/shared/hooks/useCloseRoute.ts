import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';

export function useCloseRoute(fallbackPath: string): () => void {
  const location = useLocation();
  const navigate = useNavigate();
  const canGoBack = location.key !== 'default';

  return useCallback(() => {
    if (canGoBack) {
      void navigate(-1);
      return;
    }
    void navigate(fallbackPath, { replace: true });
  }, [navigate, canGoBack, fallbackPath]);
}
