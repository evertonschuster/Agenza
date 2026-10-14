import type { ListSectionReadyProps } from '../list-section.types';

import { ListSectionEmpty } from './list-section-empty';
import { ListSectionTable } from './list-section-table';
import { ListSectionList } from './list-section-list';

function ListSectionReady<T>({
  items,
  getKey,
  renderMode,
  ariaLabel,
  emptyCopy,
  search,
}: ListSectionReadyProps<T>) {
  if (items.length === 0) {
    return <ListSectionEmpty copy={emptyCopy} search={search} />;
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
