import { Skeleton } from '@/shared/ui/skeleton';
import { PaginationLayout } from './pagination-layout';

function PaginationSkeleton() {
  return (
    <PaginationLayout
      aria-hidden="true"
      data-slot="pagination-skeleton"
      summary={<Skeleton className="h-5 w-44 max-w-full" />}
      pages={
        <div className="flex items-center justify-between gap-2 @min-[560px]:justify-center @min-[560px]:gap-1">
          <Skeleton className="h-8 w-24 pointer-coarse:h-11" />
          <Skeleton className="h-5 w-24 @min-[560px]:h-8 @min-[560px]:w-44" />
          <Skeleton className="h-8 w-24 pointer-coarse:h-11" />
        </div>
      }
      pageSize={<Skeleton className="h-8 w-32 pointer-coarse:h-11 @min-[560px]:w-44" />}
    />
  );
}

export { PaginationSkeleton };
