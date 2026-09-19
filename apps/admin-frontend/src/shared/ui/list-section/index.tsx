import { ErrorState } from '@/shared/ui/error-state';
import { cn } from '@/shared/lib/utils';
import type { ListSectionProps } from './list-section.types';

import { ListSectionSkeleton } from './components/list-section-skeleton';
import { ListSectionReady } from './components/list-section-ready';

function ListSection<T>(props: ListSectionProps<T>) {
  const { status, items, getKey, skeletonRowCount = 10, 'aria-label': ariaLabel, className } = props;

  return (
    <div className={cn(className)}>
      {status === 'loading' && <ListSectionSkeleton rowCount={skeletonRowCount} />}
      {status === 'error' && <ErrorState title="Não foi possível carregar." />}
      {status === 'ready' && (
        <ListSectionReady items={items} getKey={getKey} renderMode={props} ariaLabel={ariaLabel} />
      )}
    </div>
  );
}

export { ListSection };
export type { ListSectionColumn, ListSectionProps, ListSectionStatus } from './list-section.types';
