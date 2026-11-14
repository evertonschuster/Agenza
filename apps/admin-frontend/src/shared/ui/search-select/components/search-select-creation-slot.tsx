import type { SearchSelectCreationSlotProps, SearchSelectItem } from '../search-select.types';

function SearchSelectCreationSlot<T extends SearchSelectItem>(
  props: SearchSelectCreationSlotProps<T>,
) {
  const { creation, request } = props;
  return creation.render(request);
}

export { SearchSelectCreationSlot };
