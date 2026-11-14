import { useId, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { cn } from '@/shared/lib/utils';
import { DEFAULT_PAGE_SIZE } from '@/shared/pagination/paging';
import { Button } from '@/shared/ui/button';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxCollection,
  ComboboxContent,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxList,
  ComboboxTrigger,
} from '@/shared/ui/combobox';
import { SearchSelectAnnouncement } from './components/search-select-announcement';
import { SearchSelectCreateButton } from './components/search-select-create-button';
import { SearchSelectCreateRow } from './components/search-select-create-row';
import { SearchSelectCreationSlot } from './components/search-select-creation-slot';
import { SearchSelectEmpty } from './components/search-select-empty';
import { SearchSelectError } from './components/search-select-error';
import { SearchSelectLimitNotice } from './components/search-select-limit-notice';
import { SearchSelectSelection } from './components/search-select-selection';
import { SearchSelectSkeleton } from './components/search-select-skeleton';
import { creationTextOf } from './creation-text';
import { keepKeysInPicker } from './keep-keys-in-picker';
import { limitNoticeOf } from './limit-notice';
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
    creation,
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
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [creationRequest, setCreationRequest] = useState<string | null>(null);
  const limitNoticeId = useId();
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
  const creationText = creationTextOf({
    text,
    searched: options.searched,
    phase,
    items: options.items,
  });
  const creationDisabled = disabled || reachedLimit !== null;

  function changeOpen(next: boolean) {
    setOpen(next);
    if (next) {
      options.open();
      return;
    }
    options.cancel();
  }

  function startCreation() {
    if (creationDisabled) return;
    changeOpen(false);
    setCreationRequest(creationText);
  }

  function searchInput() {
    return anchor.current?.querySelector('input') ?? null;
  }

  function endCreation() {
    flushSync(() => setCreationRequest(null));
    searchInput()?.focus();
  }

  function completeCreation(created: T) {
    onValueChange([...value, created]);
    endCreation();
  }

  function creationLabel() {
    if (!creation) return '';
    if (!creationText) return creation.actionLabel;
    return creation.actionLabelFor(creationText);
  }

  return (
    <>
      <Combobox<T, true>
        multiple
        items={options.items}
        filter={null}
        value={value}
        onValueChange={onValueChange}
        isItemEqualToValue={(item, chosen) => item.id === chosen.id}
        itemToStringValue={(item) => item.id}
        open={open}
        onOpenChange={changeOpen}
        onOpenChangeComplete={(isOpen) => {
          if (!isOpen) options.reset();
        }}
        onInputValueChange={(typed, details) => {
          setText(typed);
          if (details.reason === 'input-change') options.search(typed);
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
          {creation && (
            <>
              <SearchSelectCreateButton
                label={creation.actionLabel}
                disabled={creationDisabled}
                limitNoticeId={reachedLimit === null ? undefined : limitNoticeId}
                onCreate={startCreation}
              />
              <span id={limitNoticeId} hidden>
                {limitNoticeOf(reachedLimit)}
              </span>
            </>
          )}
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
            <ComboboxCollection>
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
            </ComboboxCollection>
            {phase.kind === 'loadingNext' && <SearchSelectSkeleton rows={2} />}
          </ComboboxList>
          <SearchSelectEmpty
            settled={phase.kind === 'ready'}
            searched={options.searched}
            emptyMessage={emptyMessage}
          />
          {phase.kind === 'loadingFirst' && <SearchSelectSkeleton rows={3} />}
          {phase.kind === 'failed' && (
            <SearchSelectError
              problem={phase.problem}
              errorMessage={errorMessage}
              onRetry={options.retry}
            />
          )}
          {creation && (
            <SearchSelectCreateRow
              label={creationLabel()}
              emphasized={phase.kind === 'ready' && options.items.length === 0}
              disabled={creationDisabled}
              onCreate={startCreation}
            />
          )}
          <SearchSelectSelection
            selected={value.length}
            maxSelected={maxSelected}
            disabled={disabled}
            onClear={() => onValueChange([])}
          />
        </ComboboxContent>
      </Combobox>
      {creation && creationRequest !== null && (
        <SearchSelectCreationSlot
          creation={creation}
          request={{
            text: creationRequest,
            finalFocus: searchInput,
            complete: completeCreation,
            cancel: endCreation,
          }}
        />
      )}
    </>
  );
}

export { SearchSelect };
