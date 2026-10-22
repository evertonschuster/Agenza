import { cn } from '@/shared/lib/utils';
import { MAX_PAGE_SIZE } from '@/shared/pagination/paging';
import { ListSection } from '@/widgets/list-section';
import { PaginatedListSectionFooter } from './components/paginated-list-section-footer';
import type { PaginatedListSectionProps } from './paginated-list-section.types';

function PaginatedListSection<T>({
  pagination,
  itemLabel,
  className,
  ...list
}: PaginatedListSectionProps<T>) {
  return (
    <div className={cn('space-y-4', className)}>
      <ListSection {...list} skeletonRowCount={Math.min(pagination.pageSize, MAX_PAGE_SIZE)} />
      <PaginatedListSectionFooter
        status={list.status}
        pagination={pagination}
        itemLabel={itemLabel}
      />
    </div>
  );
}

export { PaginatedListSection };
