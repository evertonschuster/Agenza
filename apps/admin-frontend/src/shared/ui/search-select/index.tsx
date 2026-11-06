import { useRef, useState } from 'react';
import { Combobox as ComboboxPrimitive } from '@base-ui/react';
import { SearchSelectControl } from './components/search-select-control';
import { SearchSelectPopup } from './components/search-select-popup';
import type { SearchSelectItem, SearchSelectProps } from './search-select.types';

type ChangeDetails = ComboboxPrimitive.Root.ChangeEventDetails;
type InputKeyDown = NonNullable<ComboboxPrimitive.Input.Props['onKeyDown']>;

function selectionOf<T extends SearchSelectItem>(props: SearchSelectProps<T>): T[] {
  if (props.multiple) return props.value;
  return props.value ? [props.value] : [];
}

function SearchSelect<T extends SearchSelectItem>(props: SearchSelectProps<T>) {
  const {
    items,
    placeholder = 'Selecione ou busque',
    emptyMessage = 'Nenhuma opção disponível.',
    errorMessage = 'Não foi possível carregar as opções.',
    loading = false,
    failure,
    more,
    onOpenChange,
    onSearchChange,
    onSearchSubmit,
    disabled,
    inputRef,
    onBlur,
    id,
    className,
  } = props;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const highlighted = useRef<T | undefined>(undefined);
  const multiple = props.multiple ?? false;
  const selected = selectionOf(props);

  function onOpenStateChange(next: boolean) {
    setOpen(next);
    onOpenChange?.(next);
  }

  const onInputKeyDown: InputKeyDown = (event) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    if (open && highlighted.current !== undefined) return;
    if (!open && query.trim() === '') return;
    event.preventDefault();
    event.preventBaseUIHandler();
    onSearchSubmit?.(query);
  };

  function onInputValueChange(value: string, details: ChangeDetails) {
    setQuery(value);
    if (details.reason === 'input-change') onSearchChange?.(value);
  }

  function onValueChange(next: T | T[] | null) {
    if (props.multiple) {
      props.onValueChange(Array.isArray(next) ? next : []);
      return;
    }
    props.onValueChange(Array.isArray(next) ? null : next);
  }

  function onClear() {
    onValueChange(multiple ? [] : null);
  }

  return (
    <ComboboxPrimitive.Root<T, boolean>
      items={items}
      filter={onSearchChange ? null : undefined}
      multiple={multiple}
      value={props.value}
      onValueChange={onValueChange}
      isItemEqualToValue={(item, value) => item.id === value.id}
      itemToStringLabel={(item) => item.name}
      itemToStringValue={(item) => item.id}
      onOpenChange={onOpenStateChange}
      onInputValueChange={onInputValueChange}
      onItemHighlighted={(item) => {
        highlighted.current = item;
      }}
      autoHighlight={!onSearchChange}
      disabled={disabled ?? false}
    >
      <SearchSelectControl
        multiple={multiple}
        selected={selected}
        placeholder={placeholder}
        anchorRef={anchorRef}
        inputRef={inputRef}
        onBlur={onBlur}
        onKeyDown={onInputKeyDown}
        id={id}
        aria-invalid={props['aria-invalid']}
        aria-describedby={props['aria-describedby']}
        className={className}
      />
      <SearchSelectPopup
        anchorRef={anchorRef}
        multiple={multiple}
        selected={selected}
        maxSelected={props.multiple ? props.maxSelected : undefined}
        shown={items.length}
        query={query}
        loading={loading}
        failure={failure}
        more={more}
        emptyMessage={emptyMessage}
        errorMessage={errorMessage}
        onClear={onClear}
      />
    </ComboboxPrimitive.Root>
  );
}

export { SearchSelect };
export type {
  SearchSelectFailure,
  SearchSelectItem,
  SearchSelectMore,
  SearchSelectMultipleProps,
  SearchSelectProps,
  SearchSelectSingleProps,
  SearchSelectSourceProps,
} from './search-select.types';
