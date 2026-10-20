import { ListSectionStatus } from '@/widgets/list-section';
import { Pagination, PaginationSkeleton } from '@/widgets/pagination';
import type { PaginatedListSectionFooterProps } from '../paginated-list-section.types';

function PaginatedListSectionFooter({
  status,
  pagination,
  itemLabel,
}: PaginatedListSectionFooterProps) {
  const { totalCount, ...paging } = pagination;

  if (status === ListSectionStatus.Error) return null;
  if (totalCount !== null) {
    return <Pagination {...paging} totalCount={totalCount} itemLabel={itemLabel} />;
  }
  if (status === ListSectionStatus.Loading) return <PaginationSkeleton />;
  return null;
}

export { PaginatedListSectionFooter };
