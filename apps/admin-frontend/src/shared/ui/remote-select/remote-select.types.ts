import type { Ref } from 'react';
import type { ApiResult } from '@/shared/api/servicesFacade';
import type { PagedResult, Paging } from '@/shared/pagination/paging';

interface RemoteSelectItem {
  id: string;
  name: string;
  color?: string | undefined;
}

type RemoteItemsQuery = { search: string } & Paging;

interface LoadRemoteItems<T> {
  (query: RemoteItemsQuery, signal: AbortSignal): Promise<ApiResult<PagedResult<T>>>;
}

interface RemoteSelectOwnProps<T extends RemoteSelectItem> {
  loadItems: LoadRemoteItems<T>;
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

type RemoteSelectName =
  { 'aria-label': string; id?: string | undefined } | { id: string; 'aria-label'?: undefined };

type RemoteSelectProps<T extends RemoteSelectItem> = RemoteSelectOwnProps<T> & RemoteSelectName;

export type { LoadRemoteItems, RemoteItemsQuery, RemoteSelectItem, RemoteSelectProps };
