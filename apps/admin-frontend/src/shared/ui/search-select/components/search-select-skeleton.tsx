import { cn } from '@/shared/lib/utils';
import { Skeleton } from '@/shared/ui/skeleton';
import type { SearchSelectSkeletonProps } from '../search-select.types';

const ROW_WIDTHS = ['w-full', 'w-4/5', 'w-3/5'];

function SearchSelectSkeleton({ rows }: SearchSelectSkeletonProps) {
  return (
    <div aria-hidden="true" className="space-y-1 p-1">
      {ROW_WIDTHS.slice(0, rows).map((width) => (
        <Skeleton key={width} className={cn('h-7', width)} />
      ))}
    </div>
  );
}

export { SearchSelectSkeleton };
