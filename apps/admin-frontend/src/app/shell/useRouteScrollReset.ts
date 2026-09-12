import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

export function useRouteScrollReset<T extends HTMLElement>(): React.RefObject<T | null> {
  const ref = useRef<T>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = 0;
      ref.current.scrollLeft = 0;
    }
  }, [pathname]);

  return ref;
}
