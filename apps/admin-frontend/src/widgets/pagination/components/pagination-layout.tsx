import type { PaginationLayoutProps } from '../pagination.types';

function PaginationLayout({ summary, pages, pageSize, ...props }: PaginationLayoutProps) {
  return (
    <div className="@container" {...props}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-3 @min-[560px]:gap-x-6">
        <div className="order-1 min-w-0 flex-1 basis-36 @min-[560px]:min-w-max @min-[560px]:basis-0">
          {summary}
        </div>
        <div className="order-3 basis-full @min-[560px]:order-2 @min-[560px]:shrink-0 @min-[560px]:basis-auto">
          {pages}
        </div>
        <div className="order-2 ml-auto flex shrink-0 justify-end @min-[560px]:order-3 @min-[560px]:ml-0 @min-[560px]:min-w-max @min-[560px]:flex-1 @min-[560px]:basis-0">
          {pageSize}
        </div>
      </div>
    </div>
  );
}

export { PaginationLayout };
