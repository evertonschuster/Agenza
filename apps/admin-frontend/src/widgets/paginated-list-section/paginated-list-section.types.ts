import type { ApiResult } from '@/shared/api/servicesFacade';
import type { PagedResult, Paging } from '@/shared/pagination/paging';
import type {
  ListSectionFailure,
  ListSectionProps,
  ListSectionStatus,
} from '@/widgets/list-section';
import type { PaginationProps } from '@/widgets/pagination';

type PaginatedListSectionPaging = Omit<PaginationProps, 'totalCount'> & {
  totalCount: number | null;
};

type PaginatedListSectionProps<T> = ListSectionProps<T> & {
  pagination: PaginatedListSectionPaging;
  skeletonRowCount?: never;
};

interface PaginatedListAnswer<T> {
  requestKey: string;
  result: ApiResult<PagedResult<T>>;
}

interface PaginatedListKnownTotal {
  filtersKey: string;
  totalCount: number;
}

interface PaginatedListQuery<F> extends Paging {
  filters: F;
}

interface PaginatedListSectionFooterProps {
  status: ListSectionStatus;
  pagination: PaginatedListSectionPaging;
}

interface UsePaginatedListOptions<F, T> {
  initialFilters: F;
  fetchPage: (query: F & Paging, signal: AbortSignal) => Promise<ApiResult<PagedResult<T>>>;
}

interface PaginatedListState<T> {
  status: ListSectionStatus;
  items: readonly T[];
  failure: ListSectionFailure | null;
}

type PaginatedListPagination = Omit<PaginatedListSectionPaging, 'itemLabel'>;

interface UsePaginatedListResult<F, T> {
  filters: F;
  setFilters: (patch: Partial<F>) => void;
  list: PaginatedListState<T>;
  pagination: PaginatedListPagination;
}

export type {
  PaginatedListAnswer,
  PaginatedListKnownTotal,
  PaginatedListPagination,
  PaginatedListQuery,
  PaginatedListSectionFooterProps,
  PaginatedListSectionPaging,
  PaginatedListSectionProps,
  PaginatedListState,
  UsePaginatedListOptions,
  UsePaginatedListResult,
};
