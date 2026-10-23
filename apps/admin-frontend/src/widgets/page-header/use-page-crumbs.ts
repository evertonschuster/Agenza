import { useMatches } from 'react-router';
import type { PageCrumb, PageCrumbHandle } from './page-header.types';

function hasCrumb(handle: unknown): handle is PageCrumbHandle {
  return (
    typeof handle === 'object' &&
    handle !== null &&
    'crumb' in handle &&
    typeof handle.crumb === 'string'
  );
}

export function usePageCrumbs(): PageCrumb[] {
  return useMatches().flatMap((match) =>
    hasCrumb(match.handle) ? [{ label: match.handle.crumb, to: match.pathname }] : [],
  );
}
