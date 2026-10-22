import type { ApiResult } from '@/shared/api/servicesFacade';
import type { CountNoun } from '@/shared/format/count';
import type { PagedResult, Paging } from '@/shared/pagination/paging';
import type {
  ListSectionFailure,
  ListSectionProps,
  ListSectionStatus,
} from '@/widgets/list-section';
import type { PaginationProps } from '@/widgets/pagination';

type PaginatedListSectionPaging = Omit<PaginationProps, 'totalCount' | 'itemLabel'> & {
  totalCount: number | null;
};

type PaginatedListSectionProps<T> = Omit<ListSectionProps<T>, 'skeletonRowCount'> & {
  pagination: PaginatedListSectionPaging;
  itemLabel: CountNoun;
};

type PaginatedListQuery<F> = F & Paging;

type PaginatedListQueryState<F> = readonly [
  PaginatedListQuery<F>,
  (next: PaginatedListQuery<F>) => void,
];

interface PaginatedListSectionFooterProps {
  status: ListSectionStatus;
  pagination: PaginatedListSectionPaging;
  itemLabel: CountNoun;
}

interface UsePaginatedListOptions<F, T> {
  state: PaginatedListQueryState<F>;
  fetchPage: (query: F & Paging, signal: AbortSignal) => Promise<ApiResult<PagedResult<T>>>;
}

interface PaginatedListState<T> {
  status: ListSectionStatus;
  items: readonly T[];
  failure: ListSectionFailure | null;
}

interface UsePaginatedListResult<F, T> {
  filters: Omit<PaginatedListQuery<F>, keyof Paging>;
  applyFilters: (patch: Partial<F>) => void;
  refetch: () => void;
  list: PaginatedListState<T>;
  pagination: PaginatedListSectionPaging;
}

export type {
  PaginatedListQuery,
  PaginatedListQueryState,
  PaginatedListSectionFooterProps,
  PaginatedListSectionPaging,
  PaginatedListSectionProps,
  PaginatedListState,
  UsePaginatedListOptions,
  UsePaginatedListResult,
};
