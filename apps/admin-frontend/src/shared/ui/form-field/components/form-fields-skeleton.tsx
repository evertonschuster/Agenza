import { Skeleton } from '@/shared/ui/skeleton';
import type { FormFieldsSkeletonProps } from '../form-field.types';

export function FormFieldsSkeleton({ fieldCount }: FormFieldsSkeletonProps) {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-4">
      {Array.from({ length: fieldCount }).map((_, index) => (
        <div key={index} className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
    </div>
  );
}
