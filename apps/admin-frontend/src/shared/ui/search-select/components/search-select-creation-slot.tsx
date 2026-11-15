import type { FormEvent } from 'react';
import type { SearchSelectCreationSlotProps, SearchSelectItem } from '../search-select.types';

// In the React tree the creation sits inside the caller's <form>; a nested submit would send both.
function keepSubmitInside(event: FormEvent) {
  event.stopPropagation();
}

function SearchSelectCreationSlot<T extends SearchSelectItem>(
  props: SearchSelectCreationSlotProps<T>,
) {
  const { creation, request } = props;

  return (
    <div className="contents" onSubmit={keepSubmitInside}>
      {creation.render(request)}
    </div>
  );
}

export { SearchSelectCreationSlot };
