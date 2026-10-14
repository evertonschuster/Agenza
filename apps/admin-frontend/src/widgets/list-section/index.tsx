import { cn } from '@/shared/lib/utils';
import { Pagination } from '@/widgets/pagination';
import { ListSectionStatus, type ListSectionProps } from './list-section.types';

import { ListSectionSkeleton } from './components/list-section-skeleton';
import { ListSectionError } from './components/list-section-error';
import { ListSectionReady } from './components/list-section-ready';

function ListSection<T>(props: ListSectionProps<T>) {
  const {
    status,
    items,
    getKey,
    skeletonRowCount = 10,
    emptyCopy,
    search,
    errorTitle,
    failure,
    pagination,
    'aria-label': ariaLabel,
    className,
  } = props;

  return (
    <div className={cn('space-y-4', className)}>
      {status === ListSectionStatus.Loading && <ListSectionSkeleton rowCount={skeletonRowCount} />}
      {status === ListSectionStatus.Error && (
        <ListSectionError title={errorTitle} failure={failure} />
      )}
      {status === ListSectionStatus.Ready && (
        <ListSectionReady
          items={items}
          getKey={getKey}
          renderMode={props}
          ariaLabel={ariaLabel}
          emptyCopy={emptyCopy}
          search={search}
        />
      )}
      {pagination && status !== ListSectionStatus.Error && (
        <Pagination {...pagination} disabled={status === ListSectionStatus.Loading} />
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
  ListSectionPagination,
  ListSectionProps,
} from './list-section.types';
