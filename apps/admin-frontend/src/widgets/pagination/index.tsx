import { getLastPage } from '@/shared/pagination/paging';
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

  return (
    <div className="@container">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="min-w-max flex-1 basis-0">
          <PaginationSummary
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            itemLabel={itemLabel}
          />
        </div>
        <PaginationPages
          page={page}
          lastPage={getLastPage(totalCount, pageSize)}
          onPageChange={onPageChange}
          disabled={disabled}
        />
        <div className="flex min-w-max flex-1 basis-0 justify-end">
          <PaginationPageSize
            pageSize={pageSize}
            onPageSizeChange={onPageSizeChange}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}

export { Pagination };
export type { PaginationItemLabel, PaginationProps } from './pagination.types';
