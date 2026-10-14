import { PAGE_SIZE_OPTIONS, getLastPage } from '@/shared/pagination/paging';
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
  disabled,
}: PaginationProps) {
  if (totalCount <= 0) return null;

  const lastPage = getLastPage(totalCount, pageSize);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <PaginationSummary
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          itemLabel={itemLabel}
        />
        {totalCount > PAGE_SIZE_OPTIONS[0] && (
          <PaginationPageSize
            pageSize={pageSize}
            onPageSizeChange={onPageSizeChange}
            disabled={disabled}
          />
        )}
      </div>
      {lastPage > 1 && (
        <PaginationPages
          page={page}
          lastPage={lastPage}
          onPageChange={onPageChange}
          disabled={disabled}
        />
      )}
    </div>
  );
}

export { Pagination };
export type { PaginationItemLabel, PaginationProps } from './pagination.types';
