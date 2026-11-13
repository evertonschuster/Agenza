import { ComboboxEmpty } from '@/shared/ui/combobox';
import type { SearchSelectEmptyProps } from '../search-select.types';

function emptyTextOf(searched: string, emptyMessage: string) {
  const text = searched.trim();
  if (text) return `Nenhum resultado para «${text}».`;
  return emptyMessage;
}

function SearchSelectEmpty({ settled, searched, emptyMessage }: SearchSelectEmptyProps) {
  return (
    <ComboboxEmpty className="px-3 py-4 empty:hidden">
      {settled ? emptyTextOf(searched, emptyMessage) : null}
    </ComboboxEmpty>
  );
}

export { SearchSelectEmpty };
