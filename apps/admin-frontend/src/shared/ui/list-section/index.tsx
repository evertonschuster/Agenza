import type { ReactNode } from 'react';
import { Skeleton } from '@/shared/ui/skeleton';
import { EmptyState } from '@/shared/ui/empty-state';
import { ErrorState } from '@/shared/ui/error-state';
import { cn } from '@/shared/lib/utils';
import type { ListSectionProps } from './list-section.types';

function ListSection<T>(props: ListSectionProps<T>) {
  const { status, items, getKey, skeletonRowCount = 3, 'aria-label': ariaLabel, className } = props;

  let readyContent: ReactNode = null;
  if (status === 'ready') {
    if (items.length === 0) {
      readyContent = <EmptyState title="Nenhum item encontrado." />;
    } else if (props.columns) {
      const columns = props.columns;
      readyContent = (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm" aria-label={ariaLabel}>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={cn(
                      'px-4 py-2.5 text-left text-xs font-medium text-muted-foreground',
                      column.align === 'end' && 'text-right',
                    )}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={getKey(item)} className="border-t border-border hover:bg-accent">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn('px-4 py-2.5', column.align === 'end' && 'text-right')}
                    >
                      {column.cell(item)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    } else {
      const renderItem = props.renderItem;
      readyContent = (
        <ul
          role="list"
          aria-label={ariaLabel}
          className="overflow-hidden rounded-xl border border-border bg-card"
        >
          {items.map((item) => (
            <li
              key={getKey(item)}
              role="listitem"
              className="border-b border-border last:border-b-0"
            >
              {renderItem(item)}
            </li>
          ))}
        </ul>
      );
    }
  }

  return (
    <div className={cn(className)}>
      {status === 'loading' && (
        <div
          aria-busy="true"
          aria-live="polite"
          className="overflow-hidden rounded-xl border border-border bg-card"
        >
          {Array.from({ length: skeletonRowCount }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
            >
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      )}

      {status === 'error' && <ErrorState title="Não foi possível carregar." />}
      {readyContent}
    </div>
  );
}

export { ListSection };
export type { ListSectionColumn, ListSectionProps, ListSectionStatus } from './list-section.types';
