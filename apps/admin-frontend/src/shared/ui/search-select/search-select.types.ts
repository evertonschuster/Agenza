import type { Ref } from 'react';
import type { ApiResult } from '@/shared/api/servicesFacade';
import type { PagedResult, Paging } from '@/shared/pagination/paging';

interface SearchSelectItem {
  id: string;
  name: string;
  color?: string | undefined;
}

type SearchItemsQuery = { search: string } & Paging;

interface LoadSearchItems<T> {
  (query: SearchItemsQuery, signal: AbortSignal): Promise<ApiResult<PagedResult<T>>>;
}

interface SearchSelectOwnProps<T extends SearchSelectItem> {
  loadItems: LoadSearchItems<T>;
  value: T[];
  onValueChange: (value: T[]) => void;
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

export type { LoadSearchItems, SearchItemsQuery, SearchSelectItem, SearchSelectProps };
