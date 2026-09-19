import type { ReactNode } from 'react';
import { EmptyState } from '@/shared/ui/empty-state';
import { ErrorState } from '@/shared/ui/error-state';
import { cn } from '@/shared/lib/utils';
import type { ListSectionProps } from './list-section.types';

import { ListSectionSkeleton } from './components/list-section-skeleton';
import { ListSectionTable } from './components/list-section-table';
import { ListSectionList } from './components/list-section-list';

function ListSection<T>(props: ListSectionProps<T>) {
  const {
    status,
    items,
    getKey,
    skeletonRowCount = 3,
    'aria-label': ariaLabel,
    className
  } = props;

  let readyContent: ReactNode = null;
  if (status === 'ready') {
    if (items.length === 0) {
      readyContent = <EmptyState title="Nenhum item encontrado." />;
    } else if (props.columns) {
      const columns = props.columns;
      readyContent = (
        <ListSectionTable items={items} columns={columns} getKey={getKey} ariaLabel={ariaLabel} />
      );
    } else {
      const renderItem = props.renderItem;
      readyContent = (
        <ListSectionList
          items={items}
          renderItem={renderItem}
          getKey={getKey}
          ariaLabel={ariaLabel}
        />
      );
    }
  }

  return (
    <div className={cn(className)}>
      {status === 'loading' && <ListSectionSkeleton rowCount={skeletonRowCount} />}
      {status === 'error' && <ErrorState title="Não foi possível carregar." />}
      {readyContent}
    </div>
  );
}

export { ListSection };
export type { ListSectionColumn, ListSectionProps, ListSectionStatus } from './list-section.types';
