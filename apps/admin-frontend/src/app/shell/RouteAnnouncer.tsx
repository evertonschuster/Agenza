import { useEffect, useRef, useState } from 'react';
import { useMatches } from 'react-router';

export interface RouteHandle {
  title: string;
}

function isRouteHandle(handle: unknown): handle is RouteHandle {
  return (
    typeof handle === 'object' &&
    handle !== null &&
    typeof (handle as RouteHandle).title === 'string'
  );
}

export function RouteAnnouncer() {
  const matches = useMatches();
  const [announcement, setAnnouncement] = useState('');
  const skipNext = useRef(true);

  const title = [...matches].reverse().find((match) => isRouteHandle(match.handle))?.handle as
    RouteHandle | undefined;

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    setAnnouncement(title?.title ?? '');
  }, [title?.title]);

  return (
    <div role="status" aria-live="polite" className="sr-only">
      {announcement}
    </div>
  );
}
