import { cn } from '@/shared/lib/utils';
import { ListSectionStatus, type ListSectionProps } from './list-section.types';

import { ListSectionSkeleton } from './components/list-section-skeleton';
import { ListSectionError } from './components/list-section-error';
import { ListSectionReady } from './components/list-section-ready';

function ListSection<T>({
  columns,
  status,
  items,
  getKey,
  skeletonRowCount = 10,
  emptyCopy,
  search,
  errorTitle,
  failure,
  'aria-label': ariaLabel,
  className,
}: ListSectionProps<T>) {
  return (
    <div className={cn(className)}>
      {status === ListSectionStatus.Loading && (
        <ListSectionSkeleton rowCount={skeletonRowCount} columns={columns} ariaLabel={ariaLabel} />
      )}
      {status === ListSectionStatus.Error && (
        <ListSectionError title={errorTitle} failure={failure} />
      )}
      {status === ListSectionStatus.Ready && (
        <ListSectionReady
          items={items}
          columns={columns}
          getKey={getKey}
          ariaLabel={ariaLabel}
          emptyCopy={emptyCopy}
          search={search}
        />
      )}
    </div>
  );
}

export { ListSection };
export { ListSectionStatus } from './list-section.types';
export type {
  ListSectionColumn,
  ListSectionEmptyCopy,
  ListSectionFailure,
  ListSectionProps,
} from './list-section.types';
