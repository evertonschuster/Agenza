import { ListSectionStatus } from '@/widgets/list-section';
import { Pagination, PaginationSkeleton } from '@/widgets/pagination';
import type { PaginatedListSectionFooterProps } from '../paginated-list-section.types';

function PaginatedListSectionFooter({ status, pagination }: PaginatedListSectionFooterProps) {
  const { totalCount, ...footer } = pagination;

  if (status === ListSectionStatus.Error) return null;
  if (totalCount !== null) return <Pagination {...footer} totalCount={totalCount} />;
  if (status === ListSectionStatus.Loading) return <PaginationSkeleton />;
  return null;
}

export { PaginatedListSectionFooter };
