import type { RefObject } from 'react';
import { Combobox as ComboboxPrimitive } from '@base-ui/react';
import { CheckIcon } from 'lucide-react';
import { ActionButton } from '@/shared/ui/action-button';
import { Button } from '@/shared/ui/button';
import { ComboboxItem, ComboboxList } from '@/shared/ui/combobox';
import { NewTabLink } from '@/shared/ui/new-tab-link';
import { Skeleton } from '@/shared/ui/skeleton';
import type {
  SearchSelectCreateLink,
  SearchSelectFailure,
  SearchSelectItem,
  SearchSelectMore,
} from '../search-select.types';

interface SearchSelectPopupProps<T extends SearchSelectItem> {
  anchorRef: RefObject<HTMLDivElement | null>;
  multiple: boolean;
  selected: readonly T[];
  maxSelected: number | undefined;
  shown: number;
  query: string;
  loading: boolean;
  failure: SearchSelectFailure | undefined;
  more: SearchSelectMore | undefined;
  emptyMessage: string;
  errorMessage: string;
  createLink: SearchSelectCreateLink | undefined;
  onClear: () => void;
}

function SearchSelectPopup<T extends SearchSelectItem>({
  anchorRef,
  multiple,
  selected,
  maxSelected,
  shown,
  query,
  loading,
  failure,
  more,
  emptyMessage,
  errorMessage,
  createLink,
  onClear,
}: SearchSelectPopupProps<T>) {
  const selectedIds = new Set(selected.map((item) => item.id));
  const limitReached = maxSelected !== undefined && selected.length >= maxSelected;
  const searched = query.trim();

  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        anchor={anchorRef}
        side="bottom"
        sideOffset={4}
        align="start"
        className="isolate z-50"
      >
        <ComboboxPrimitive.Popup
          data-slot="search-select-content"
          className="relative isolate z-50 flex max-h-[min(24rem,var(--available-height))] w-(--anchor-width) min-w-56 origin-(--transform-origin) flex-col overflow-hidden rounded-lg bg-popover text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none transition data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0"
        >
          {multiple && limitReached && (
            <p role="status" className="m-1 mb-0 rounded-md bg-muted px-2.5 py-2">
              Limite de {maxSelected} seleções atingido. Remova uma para escolher outra.
            </p>
          )}

          {loading && (
            <div role="status" className="space-y-1 p-1">
              <span className="sr-only">Carregando…</span>
              <Skeleton className="h-7 w-full" />
              <Skeleton className="h-7 w-4/5" />
              <Skeleton className="h-7 w-3/5" />
            </div>
          )}

          {failure && (
            <div role="alert" className="flex flex-col items-center gap-1 px-3 py-4 text-center">
              <p className="font-medium">{errorMessage}</p>
              {failure.detail && <p className="text-muted-foreground">{failure.detail}</p>}
              <Button variant="outline" size="sm" className="mt-2" onClick={failure.onRetry}>
                Tentar novamente
              </Button>
            </div>
          )}

          <ComboboxPrimitive.Empty className="empty:hidden flex flex-col items-center gap-2 px-3 py-4 text-center text-muted-foreground">
            {!loading && !failure && (
              <>
                <p>{searched ? `Nenhum resultado para “${searched}”.` : emptyMessage}</p>
                {!searched && createLink && (
                  <NewTabLink to={createLink.to}>{createLink.label}</NewTabLink>
                )}
              </>
            )}
          </ComboboxPrimitive.Empty>

          <ComboboxList>
            {(item: T) => (
              <ComboboxItem
                key={item.id}
                value={item}
                disabled={limitReached && !selectedIds.has(item.id)}
              >
                {multiple && (
                  <span
                    aria-hidden="true"
                    className="flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input in-data-selected:border-primary in-data-selected:bg-primary in-data-selected:text-primary-foreground"
                  >
                    <ComboboxPrimitive.ItemIndicator>
                      <CheckIcon className="size-3" />
                    </ComboboxPrimitive.ItemIndicator>
                  </span>
                )}
                {item.color && (
                  <span
                    aria-hidden="true"
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                )}
                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                {!multiple && (
                  <ComboboxPrimitive.ItemIndicator>
                    <CheckIcon aria-hidden="true" />
                  </ComboboxPrimitive.ItemIndicator>
                )}
              </ComboboxItem>
            )}
          </ComboboxList>

          {more && (
            <div className="flex items-center justify-between gap-2 px-2.5 pb-1 text-xs text-muted-foreground">
              <span>
                Mostrando {shown} de {more.total}
              </span>
              <ActionButton
                variant="ghost"
                size="sm"
                className="text-foreground"
                pending={more.pending}
                onClick={more.onLoadMore}
              >
                Carregar mais
              </ActionButton>
            </div>
          )}

          {multiple && (
            <div className="flex items-center justify-between gap-2 border-t border-border py-1 pr-1 pl-2.5 text-xs text-muted-foreground">
              <span>
                {maxSelected === undefined
                  ? `Selecionadas: ${selected.length}`
                  : `Selecionadas: ${selected.length} de ${maxSelected}`}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-foreground"
                disabled={selected.length === 0}
                focusableWhenDisabled
                onClick={onClear}
              >
                Limpar seleção
              </Button>
            </div>
          )}
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

export { SearchSelectPopup };
