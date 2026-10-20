import { Skeleton } from '@/shared/ui/skeleton';
import { PAGES_ROW, PaginationLayout } from './pagination-layout';

function PaginationSkeleton() {
  return (
    <PaginationLayout
      aria-hidden="true"
      data-slot="pagination-skeleton"
      summary={<Skeleton className="h-5 w-44 max-w-full" />}
      pages={
        <div className={PAGES_ROW}>
          <Skeleton className="h-8 w-24 pointer-coarse:h-11" />
          <Skeleton className="h-5 w-24 @pagination:h-8 @pagination:w-44" />
          <Skeleton className="h-8 w-24 pointer-coarse:h-11" />
        </div>
      }
      pageSize={<Skeleton className="h-8 w-32 pointer-coarse:h-11 @pagination:w-44" />}
    />
  );
}

export { PaginationSkeleton };
