import { useSyncExternalStore } from 'react';

export type ViewportKind = 'bottom' | 'rail' | 'sidebar';

const RAIL_QUERY = '(min-width: 768px)';
const SIDEBAR_QUERY = '(min-width: 1024px)';

function getSnapshot(): ViewportKind {
  if (window.matchMedia(SIDEBAR_QUERY).matches) return 'sidebar';
  if (window.matchMedia(RAIL_QUERY).matches) return 'rail';
  return 'bottom';
}

function subscribe(onChange: () => void): () => void {
  const rail = window.matchMedia(RAIL_QUERY);
  const sidebar = window.matchMedia(SIDEBAR_QUERY);
  rail.addEventListener('change', onChange);
  sidebar.addEventListener('change', onChange);
  return () => {
    rail.removeEventListener('change', onChange);
    sidebar.removeEventListener('change', onChange);
  };
}

export function useViewportKind(): ViewportKind {
  return useSyncExternalStore(subscribe, getSnapshot);
}
