import type { PaginationLayoutProps } from '../pagination.types';

const PAGES_ROW =
  'flex items-center justify-between gap-2 @pagination:justify-center @pagination:gap-1';

function PaginationLayout({ summary, pages, pageSize, ...props }: PaginationLayoutProps) {
  return (
    <div className="@container" {...props}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-3 @pagination:gap-x-6">
        <div className="order-1 min-w-0 flex-1 basis-36 @pagination:min-w-max @pagination:basis-0">
          {summary}
        </div>
        <div className="order-3 basis-full @pagination:order-2 @pagination:shrink-0 @pagination:basis-auto">
          {pages}
        </div>
        <div className="order-2 ml-auto flex shrink-0 justify-end @pagination:order-3 @pagination:ml-0 @pagination:min-w-max @pagination:flex-1 @pagination:basis-0">
          {pageSize}
        </div>
      </div>
    </div>
  );
}

export { PAGES_ROW, PaginationLayout };
