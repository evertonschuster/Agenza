import type { ListSectionReadyProps } from '../list-section.types';

import { ListSectionEmpty } from './list-section-empty';
import { ListSectionTable } from './list-section-table';

function ListSectionReady<T>({
  items,
  columns,
  getKey,
  ariaLabel,
  emptyCopy,
  search,
}: ListSectionReadyProps<T>) {
  if (items.length === 0) {
    return <ListSectionEmpty copy={emptyCopy} search={search} />;
  }

  return <ListSectionTable items={items} columns={columns} getKey={getKey} ariaLabel={ariaLabel} />;
}

export { ListSectionReady };
