import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

export function useRouteFocus<T extends HTMLElement>(): React.RefObject<T | null> {
  const ref = useRef<T>(null);
  const { pathname } = useLocation();
  const skipNext = useRef(true);

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    ref.current?.focus();
    if (ref.current) {
      ref.current.scrollTop = 0;
      ref.current.scrollLeft = 0;
    }
  }, [pathname]);

  return ref;
}
