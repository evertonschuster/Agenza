import type { ApiProblem, ApiResult } from '@/shared/api/servicesFacade';
import type { PagedResult, Paging } from '@/shared/pagination/paging';
import type {
  SearchSelectItem,
  SearchSelectMultipleProps,
  SearchSelectSingleProps,
  SearchSelectSourceProps,
} from '@/shared/ui/search-select';

type RemoteItemsQuery = { search: string } & Paging;

interface LoadRemoteItems<T> {
  (query: RemoteItemsQuery, signal: AbortSignal): Promise<ApiResult<PagedResult<T>>>;
}

interface RemoteSourceProps<T> {
  loadItems: LoadRemoteItems<T>;
  pageSize?: number | undefined;
}

type RemoteSearchSelectProps<T extends SearchSelectItem> = RemoteSourceProps<T> &
  (
    | Omit<SearchSelectSingleProps<T>, SearchSelectSourceProps>
    | Omit<SearchSelectMultipleProps<T>, SearchSelectSourceProps>
  );

const RemoteItemsStatus = {
  Idle: 'idle',
  Loading: 'loading',
  LoadingMore: 'loadingMore',
  Ready: 'ready',
  Error: 'error',
} as const;

type RemoteItemsStatus = (typeof RemoteItemsStatus)[keyof typeof RemoteItemsStatus];

interface RemoteItemsState<T> {
  status: RemoteItemsStatus;
  search: string;
  page: number;
  items: readonly T[];
  totalCount: number;
  problem: ApiProblem | null;
}

export { RemoteItemsStatus };
export type { LoadRemoteItems, RemoteItemsQuery, RemoteItemsState, RemoteSearchSelectProps };
