import { Skeleton } from '@/shared/ui/skeleton';
import type { ListSectionSkeletonProps } from '../list-section.types';
import { ListSectionTable } from './list-section-table';

function ListSectionSkeleton<T>({ rowCount, columns, ariaLabel }: ListSectionSkeletonProps<T>) {
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

export { ListSectionSkeleton };
