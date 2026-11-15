import type { SyntheticEvent } from 'react';
import type { SearchSelectCreationSlotProps, SearchSelectItem } from '../search-select.types';

// In the React tree the creation sits inside the caller's <form>; a nested submit would send both.
function keepFormEventsInside(event: SyntheticEvent) {
  event.stopPropagation();
}

function SearchSelectCreationSlot<T extends SearchSelectItem>(
  props: SearchSelectCreationSlotProps<T>,
) {
  const { creation, request } = props;

  return (
    <div className="contents" onSubmit={keepFormEventsInside} onReset={keepFormEventsInside}>
      {creation.render(request)}
    </div>
  );
}

export { SearchSelectCreationSlot };
