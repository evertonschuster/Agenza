import { useEffect, useEffectEvent, useRef, type CSSProperties } from 'react';
import type { Combobox as ComboboxPrimitive } from '@base-ui/react';
import { formatCount } from '@/shared/format/count';
import { cn } from '@/shared/lib/utils';
import { DEFAULT_PAGE_SIZE } from '@/shared/pagination/paging';
import { Button } from '@/shared/ui/button';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxList,
  ComboboxStatus,
  ComboboxTrigger,
} from '@/shared/ui/combobox';
import { SearchSelectFooter, SearchSelectStatus } from './components/search-select-states';
import type { SearchSelectItem, SearchSelectProps } from './search-select.types';
import { useSearchOptions } from './use-search-options';

const LOAD_MORE_DISTANCE_PX = 40;
const SELECTION_NOUN = { singular: 'seleção', plural: 'seleções' };

type InputKeyDown = NonNullable<ComboboxPrimitive.Input.Props['onKeyDown']>;

const keepKeysInPicker: InputKeyDown = (event) => {
  const input = event.currentTarget;
  const open = input.getAttribute('aria-expanded') === 'true';
  if (event.key === 'Escape') {
    if (!open) event.preventBaseUIHandler();
    return;
  }
  if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
  if (!open) return;
  const modified = event.shiftKey || event.ctrlKey || event.altKey || event.metaKey;
  if (input.hasAttribute('aria-activedescendant') && !modified) return;
  event.preventDefault();
  event.preventBaseUIHandler();
};

function announcementOf(loading: 'first' | 'next' | null, limitNotice: string | null) {
  if (loading === 'first') return 'Carregando opções…';
  if (loading === 'next') return 'Carregando mais opções…';
  return limitNotice ?? '';
}

function SearchSelect<T extends SearchSelectItem>(props: SearchSelectProps<T>) {
  const {
    loadItems,
    value,
    onValueChange,
    maxSelected,
    pageSize = DEFAULT_PAGE_SIZE,
    placeholder = 'Selecione ou busque',
    emptyMessage = 'Nenhuma opção disponível.',
    errorMessage = 'Não foi possível carregar as opções.',
    disabled = false,
    inputRef,
    onBlur,
    className,
    ...inputProps
  } = props;
  const options = useSearchOptions({ loadItems, pageSize });
  const anchor = useRef<HTMLDivElement | null>(null);
  const list = useRef<HTMLDivElement | null>(null);
  const selectedIds = new Set(value.map((item) => item.id));
  const limitReached = maxSelected !== undefined && value.length >= maxSelected;
  const limitNotice = limitReached
    ? `Limite de ${formatCount(maxSelected, SELECTION_NOUN)} atingido. Remova uma para escolher outra.`
    : null;

  function loadMoreNearEnd() {
    const node = list.current;
    if (!node) return;
    if (node.scrollHeight - node.scrollTop - node.clientHeight > LOAD_MORE_DISTANCE_PX) return;
    options.loadMore();
  }

  const loadMoreIfShort = useEffectEvent(loadMoreNearEnd);

  useEffect(() => {
    loadMoreIfShort();
  }, [options.items]);

  return (
    <Combobox<T, true>
      multiple
      items={options.items}
      filter={null}
      value={value}
      onValueChange={onValueChange}
      isItemEqualToValue={(item, chosen) => item.id === chosen.id}
      itemToStringValue={(item) => item.id}
      onOpenChange={(open) => {
        if (open) {
          options.open();
          return;
        }
        options.close();
      }}
      onOpenChangeComplete={(open) => {
        if (!open) options.reset();
      }}
      onInputValueChange={(text, details) => {
        if (details.reason === 'input-change') options.search(text);
      }}
      disabled={disabled}
    >
      <ComboboxChips ref={anchor} className={cn('w-full pointer-coarse:min-h-11', className)}>
        {value.map((item) => (
          <ComboboxChip key={item.id} color={item.color} removeLabel={`Remover ${item.name}`}>
            {item.name}
          </ComboboxChip>
        ))}
        <ComboboxChipsInput
          ref={inputRef}
          onBlur={onBlur}
          onKeyDown={keepKeysInPicker}
          placeholder={placeholder}
          {...inputProps}
        />
        <ComboboxTrigger
          aria-label="Mostrar opções"
          render={<Button variant="ghost" size="icon-xs" />}
        />
      </ComboboxChips>
      <ComboboxContent anchor={anchor} className="flex flex-col">
        <ComboboxStatus className="sr-only">
          {announcementOf(options.loading, limitNotice)}
        </ComboboxStatus>
        {limitNotice && <p className="m-1 mb-0 rounded-md bg-muted px-2.5 py-2">{limitNotice}</p>}
        <ComboboxList
          ref={list}
          onScroll={loadMoreNearEnd}
          aria-busy={options.loading !== null}
          className="min-h-0 flex-1"
        >
          {(item: T) => (
            <ComboboxItem
              key={item.id}
              value={item}
              disabled={limitReached && !selectedIds.has(item.id)}
              className="pr-8 pointer-coarse:min-h-10"
            >
              <span
                className={cn('inline-flex max-w-full min-w-0', item.color && 'tag')}
                style={item.color ? ({ '--tag': item.color } as CSSProperties) : undefined}
              >
                <span className="min-w-0 truncate">{item.name}</span>
              </span>
              <ComboboxItemIndicator />
            </ComboboxItem>
          )}
        </ComboboxList>
        <SearchSelectStatus
          loading={options.loading === 'first'}
          problem={options.problem}
          searched={options.searched}
          emptyMessage={emptyMessage}
          errorMessage={errorMessage}
          onRetry={options.retry}
        />
        <SearchSelectFooter
          shown={options.items.length}
          totalCount={options.totalCount}
          hasMore={options.hasMore}
          loadingMore={options.loading === 'next'}
          selected={value.length}
          maxSelected={maxSelected}
          onClear={() => onValueChange([])}
        />
      </ComboboxContent>
    </Combobox>
  );
}

export { SearchSelect };
export type {
  LoadSearchItems,
  SearchItemsQuery,
  SearchSelectItem,
  SearchSelectProps,
} from './search-select.types';
