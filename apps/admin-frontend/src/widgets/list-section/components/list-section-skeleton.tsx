import { Skeleton } from '@/shared/ui/skeleton';
import type { ListSectionSkeletonProps } from '../list-section.types';

function ListSectionSkeleton({ rowCount }: ListSectionSkeletonProps) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      {Array.from({ length: rowCount }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
        >
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  );
}

export { ListSectionSkeleton };
