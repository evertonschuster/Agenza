import { cn } from '@/shared/lib/utils';
import { ListSection, ListSectionStatus } from '@/widgets/list-section';
import { Pagination } from '@/widgets/pagination';
import type { PaginatedListSectionProps } from './paginated-list-section.types';

function PaginatedListSection<T>({ pagination, className, ...list }: PaginatedListSectionProps<T>) {
  const { totalCount, ...footer } = pagination;
  const showFooter = totalCount !== null && list.status !== ListSectionStatus.Error;

  return (
    <div className={cn('space-y-4', className)}>
      <ListSection {...list} skeletonRowCount={pagination.pageSize} />
      {showFooter && <Pagination {...footer} totalCount={totalCount} />}
    </div>
  );
}

export { PaginatedListSection };
export type {
  PaginatedListSectionPaging,
  PaginatedListSectionProps,
} from './paginated-list-section.types';
