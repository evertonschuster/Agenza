import { Skeleton } from '@/shared/ui/skeleton';
import type { ListSectionSkeletonProps } from '../list-section.types';
import { ListSectionTable } from './list-section-table';

function ListSectionSkeleton<T>({ rowCount, columns, ariaLabel }: ListSectionSkeletonProps<T>) {
  if (columns) {
    return (
      <div aria-busy="true" aria-live="polite">
        <div aria-hidden="true" className="pointer-events-none">
          <ListSectionTable
            items={Array.from({ length: rowCount }, (_, index) => index)}
            getKey={String}
            ariaLabel={ariaLabel}
            columns={columns.map((column) => ({
              key: column.key,
              header: column.header,
              align: column.align,
              cell: () => column.skeleton ?? <Skeleton className="h-5 w-24" />,
            }))}
          />
        </div>
      </div>
    );
  }

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
