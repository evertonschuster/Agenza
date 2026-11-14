import type { ReactNode, Ref, RefObject } from 'react';
import type { Combobox as ComboboxPrimitive } from '@base-ui/react';
import type { ApiProblem, ApiResult } from '@/shared/api/servicesFacade';
import type { PagedResult, Paging } from '@/shared/pagination/paging';

interface SearchSelectItem {
  id: string;
  name: string;
}

type SearchItemsQuery = { search: string } & Paging;

type SearchPage<T> = ApiResult<PagedResult<T>>;

type LoadSearchItems<T> = (query: SearchItemsQuery, signal: AbortSignal) => Promise<SearchPage<T>>;

interface SearchSelectCreationRequest<T> {
  text: string;
  finalFocus: () => HTMLElement | null;
  complete: (created: T) => void;
  cancel: () => void;
}

interface SearchSelectCreation<T extends SearchSelectItem> {
  actionLabel: string;
  actionLabelFor: (text: string) => string;
  render: (request: SearchSelectCreationRequest<T>) => ReactNode;
}

interface SearchSelectOwnProps<T extends SearchSelectItem> {
  loadItems: LoadSearchItems<T>;
  value: T[];
  onValueChange: (value: T[]) => void;
  renderItem?: ((item: T) => ReactNode) | undefined;
  creation?: SearchSelectCreation<T> | undefined;
  maxSelected?: number | undefined;
  pageSize?: number | undefined;
  maxLength?: number | undefined;
  placeholder?: string | undefined;
  emptyMessage?: string | undefined;
  errorMessage?: string | undefined;
  disabled?: boolean | undefined;
  inputRef?: Ref<HTMLInputElement> | undefined;
  onBlur?: (() => void) | undefined;
  'aria-invalid'?: boolean | undefined;
  'aria-describedby'?: string | undefined;
  className?: string | undefined;
}

type SearchSelectName =
  { 'aria-label': string; id?: string | undefined } | { id: string; 'aria-label'?: undefined };

type SearchSelectProps<T extends SearchSelectItem> = SearchSelectOwnProps<T> & SearchSelectName;

type SearchPhase =
  | { kind: 'loadingFirst' }
  | { kind: 'loadingNext' }
  | { kind: 'failed'; problem: ApiProblem; retry: SearchItemsQuery }
  | { kind: 'ready' };

interface SearchOptionsState<T> {
  searched: string;
  items: readonly T[];
  next: SearchItemsQuery | null;
  phase: SearchPhase;
}

type SearchTimer = ReturnType<typeof setTimeout> | undefined;

interface UseSearchOptionsArgs<T> {
  loadItems: LoadSearchItems<T>;
  pageSize: number;
}

interface UseLoadMoreNearEndArgs {
  list: RefObject<HTMLElement | null>;
  items: readonly unknown[];
  loadMore: () => void;
}

type SearchInputKeyDown = NonNullable<ComboboxPrimitive.Input.Props['onKeyDown']>;

interface SearchSelectAnnouncementProps {
  readonly phase: SearchPhase;
  readonly reachedLimit: number | null;
}

interface SearchSelectLimitNoticeProps {
  readonly reachedLimit: number | null;
}

interface SearchSelectEmptyProps {
  readonly settled: boolean;
  readonly searched: string;
  readonly emptyMessage: string;
}

interface SearchSelectErrorProps {
  readonly problem: ApiProblem;
  readonly errorMessage: string;
  readonly onRetry: () => void;
}

interface SearchSelectLoadingMoreProps {
  readonly loadingMore: boolean;
}

interface SearchSelectSelectionProps {
  readonly selected: number;
  readonly maxSelected: number | undefined;
  readonly disabled: boolean;
  readonly onClear: () => void;
}

interface CreationTextArgs {
  readonly text: string;
  readonly searched: string;
  readonly phase: SearchPhase;
  readonly items: readonly SearchSelectItem[];
}

interface SearchSelectCreateButtonProps {
  readonly label: string;
  readonly disabled: boolean;
  readonly limitNoticeId: string | undefined;
  readonly onCreate: () => void;
}

interface SearchSelectCreationSlotProps<T extends SearchSelectItem> {
  readonly creation: SearchSelectCreation<T>;
  readonly request: SearchSelectCreationRequest<T>;
}

interface SearchSelectCreateRowProps {
  readonly label: string;
  readonly emphasized: boolean;
  readonly disabled: boolean;
  readonly onCreate: () => void;
}

export type {
  CreationTextArgs,
  SearchSelectCreateButtonProps,
  SearchSelectCreateRowProps,
  SearchSelectCreation,
  SearchSelectCreationRequest,
  SearchSelectCreationSlotProps,
  LoadSearchItems,
  SearchInputKeyDown,
  SearchItemsQuery,
  SearchOptionsState,
  SearchPhase,
  SearchSelectAnnouncementProps,
  SearchSelectEmptyProps,
  SearchSelectErrorProps,
  SearchSelectItem,
  SearchSelectLimitNoticeProps,
  SearchSelectLoadingMoreProps,
  SearchSelectProps,
  SearchSelectSelectionProps,
  SearchTimer,
  UseLoadMoreNearEndArgs,
  UseSearchOptionsArgs,
};
