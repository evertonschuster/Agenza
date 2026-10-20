import { cn } from '@/shared/lib/utils';
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
      <ListSection {...list} skeletonRowCount={pagination.pageSize} />
      <PaginatedListSectionFooter
        status={list.status}
        pagination={pagination}
        itemLabel={itemLabel}
      />
    </div>
  );
}

export { PaginatedListSection };
