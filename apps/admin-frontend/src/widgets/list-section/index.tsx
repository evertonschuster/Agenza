import { ErrorState } from '@/shared/ui/error-state';
import { cn } from '@/shared/lib/utils';
import { ListSectionStatus, type ListSectionProps } from './list-section.types';

import { ListSectionSkeleton } from './components/list-section-skeleton';
import { ListSectionReady } from './components/list-section-ready';

function ListSection<T>(props: ListSectionProps<T>) {
  const {
    status,
    items,
    getKey,
    skeletonRowCount = 10,
    'aria-label': ariaLabel,
    className,
  } = props;

  return (
    <div className={cn(className)}>
      {status === ListSectionStatus.Loading && <ListSectionSkeleton rowCount={skeletonRowCount} />}
      {status === ListSectionStatus.Error && <ErrorState title="Não foi possível carregar." />}
      {status === ListSectionStatus.Ready && (
        <ListSectionReady items={items} getKey={getKey} renderMode={props} ariaLabel={ariaLabel} />
      )}
    </div>
  );
}

export { ListSection };
export { ListSectionStatus } from './list-section.types';
export type { ListSectionColumn, ListSectionProps } from './list-section.types';
