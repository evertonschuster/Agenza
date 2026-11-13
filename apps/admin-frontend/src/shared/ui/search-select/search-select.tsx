import { useRef } from 'react';
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
  ComboboxTrigger,
} from '@/shared/ui/combobox';
import { SearchSelectAnnouncement } from './components/search-select-announcement';
import { SearchSelectEmpty } from './components/search-select-empty';
import { SearchSelectError } from './components/search-select-error';
import { SearchSelectLimitNotice } from './components/search-select-limit-notice';
import { SearchSelectProgress } from './components/search-select-progress';
import { SearchSelectSelection } from './components/search-select-selection';
import { SearchSelectSkeleton } from './components/search-select-skeleton';
import { keepKeysInPicker } from './keep-keys-in-picker';
import type { SearchSelectItem, SearchSelectProps } from './search-select.types';
import { useLoadMoreNearEnd } from './use-load-more-near-end';
import { useSearchOptions } from './use-search-options';

function renderName(item: SearchSelectItem) {
  return <span className="min-w-0 truncate">{item.name}</span>;
}

function SearchSelect<T extends SearchSelectItem>(props: SearchSelectProps<T>) {
  const {
    loadItems,
    value,
    onValueChange,
    renderItem = renderName,
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
  const { phase } = options;
  const anchor = useRef<HTMLDivElement | null>(null);
  const list = useRef<HTMLDivElement | null>(null);
  const loadMoreNearEnd = useLoadMoreNearEnd({
    list,
    items: options.items,
    loadMore: options.loadMore,
  });
  const selectedIds = new Set(value.map((item) => item.id));
  const reachedLimit =
    maxSelected !== undefined && value.length >= maxSelected ? maxSelected : null;
  const loading = phase.kind === 'loadingFirst' || phase.kind === 'loadingNext';

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
        options.cancel();
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
          <ComboboxChip key={item.id} removeLabel={`Remover ${item.name}`}>
            {renderItem(item)}
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
        <SearchSelectAnnouncement phase={phase} reachedLimit={reachedLimit} />
        <SearchSelectLimitNotice reachedLimit={reachedLimit} />
        <ComboboxList
          ref={list}
          onScroll={loadMoreNearEnd}
          aria-busy={loading}
          className="min-h-0 flex-1"
        >
          {(item: T) => (
            <ComboboxItem
              key={item.id}
              value={item}
              disabled={reachedLimit !== null && !selectedIds.has(item.id)}
              className="pr-8 pointer-coarse:min-h-10"
            >
              {renderItem(item)}
              <ComboboxItemIndicator />
            </ComboboxItem>
          )}
        </ComboboxList>
        <SearchSelectEmpty
          settled={phase.kind === 'ready'}
          searched={options.searched}
          emptyMessage={emptyMessage}
        />
        {phase.kind === 'loadingFirst' && <SearchSelectSkeleton />}
        {phase.kind === 'failed' && (
          <SearchSelectError
            problem={phase.problem}
            errorMessage={errorMessage}
            onRetry={options.retry}
          />
        )}
        <SearchSelectProgress
          shown={options.items.length}
          totalCount={options.totalCount}
          hasMore={options.hasMore}
          loadingMore={phase.kind === 'loadingNext'}
        />
        <SearchSelectSelection
          selected={value.length}
          maxSelected={maxSelected}
          disabled={disabled}
          onClear={() => onValueChange([])}
        />
      </ComboboxContent>
    </Combobox>
  );
}

export { SearchSelect };
