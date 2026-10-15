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
}: PaginationProps) {
  if (totalCount <= 0) return null;

  return (
    <div className="@container">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-3 @min-[560px]:gap-x-6">
        <div className="order-1 min-w-0 flex-1 basis-36 @min-[560px]:min-w-max @min-[560px]:basis-0">
          <PaginationSummary
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            itemLabel={itemLabel}
          />
        </div>
        <div className="order-3 basis-full @min-[560px]:order-2 @min-[560px]:shrink-0 @min-[560px]:basis-auto">
          <PaginationPages
            page={page}
            lastPage={getLastPage(totalCount, pageSize)}
            onPageChange={onPageChange}
          />
        </div>
        <div className="order-2 ml-auto flex shrink-0 justify-end @min-[560px]:order-3 @min-[560px]:ml-0 @min-[560px]:min-w-max @min-[560px]:flex-1 @min-[560px]:basis-0">
          <PaginationPageSize pageSize={pageSize} onPageSizeChange={onPageSizeChange} />
        </div>
      </div>
    </div>
  );
}

export { Pagination };
export type { PaginationItemLabel, PaginationProps } from './pagination.types';
