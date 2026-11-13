import { Skeleton } from '@/shared/ui/skeleton';

function SearchSelectSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-1 p-1">
      <Skeleton className="h-7 w-full" />
      <Skeleton className="h-7 w-4/5" />
      <Skeleton className="h-7 w-3/5" />
    </div>
  );
}

export { SearchSelectSkeleton };
