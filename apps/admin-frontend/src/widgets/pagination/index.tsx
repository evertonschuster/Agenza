import { getLastPage } from '@/shared/pagination/paging';
import { PaginationLayout } from './components/pagination-layout';
import { PaginationPages } from './components/pagination-pages';
import { PaginationPageSize } from './components/pagination-page-size';
import { PaginationSummary } from './components/pagination-summary';
import type { PaginationProps } from './pagination.types';

function Pagination({
  page,
  pageSize,
  totalCount,
  itemLabel,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  if (totalCount <= 0) return null;

  return (
    <PaginationLayout
      summary={
        <PaginationSummary
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          itemLabel={itemLabel}
        />
      }
      pages={
        <PaginationPages
          page={page}
          lastPage={getLastPage(totalCount, pageSize)}
          onPageChange={onPageChange}
        />
      }
      pageSize={<PaginationPageSize pageSize={pageSize} onPageSizeChange={onPageSizeChange} />}
    />
  );
}

export { Pagination };
export { PaginationSkeleton } from './components/pagination-skeleton';
export type { PaginationItemLabel, PaginationProps } from './pagination.types';
