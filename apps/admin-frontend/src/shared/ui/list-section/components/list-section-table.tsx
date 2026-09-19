import { cn } from '@/shared/lib/utils';
import type { ListSectionTableProps } from '../list-section.types';

function ListSectionTable<T>({ items, columns, getKey, ariaLabel }: ListSectionTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
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
}

export { ListSectionTable };
