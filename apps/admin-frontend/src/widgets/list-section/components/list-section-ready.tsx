import { EmptyState } from '@/shared/ui/empty-state';
import type { ListSectionReadyProps } from '../list-section.types';

import { ListSectionTable } from './list-section-table';
import { ListSectionList } from './list-section-list';

function ListSectionReady<T>({ items, getKey, renderMode, ariaLabel }: ListSectionReadyProps<T>) {
  if (items.length === 0) {
    return <EmptyState title="Nenhum item encontrado." />;
  }

  if (renderMode.columns) {
    return (
      <ListSectionTable
        items={items}
        columns={renderMode.columns}
        getKey={getKey}
        ariaLabel={ariaLabel}
      />
    );
  }

  return (
    <ListSectionList
      items={items}
      renderItem={renderMode.renderItem}
      getKey={getKey}
      ariaLabel={ariaLabel}
    />
  );
}

export { ListSectionReady };
