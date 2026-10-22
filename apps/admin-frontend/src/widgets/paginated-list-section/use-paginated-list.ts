import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { ApiResult } from '@/shared/api/servicesFacade';
import { FIRST_PAGE, getLastPage, type PagedResult } from '@/shared/pagination/paging';
import { ListSectionStatus } from '@/widgets/list-section';
import type {
  PaginatedListQuery,
  PaginatedListState,
  UsePaginatedListOptions,
  UsePaginatedListResult,
} from './paginated-list-section.types';

function toListState<T>(
  result: ApiResult<PagedResult<T>> | null,
  onRetry: () => void,
): PaginatedListState<T> {
  if (result === null) {
    return { status: ListSectionStatus.Loading, items: [], failure: null };
  }

  if (!result.ok) {
    return {
      status: ListSectionStatus.Error,
      items: [],
      failure: { problem: result.error, onRetry },
    };
  }

  return { status: ListSectionStatus.Ready, items: result.data.items, failure: null };
}

export function usePaginatedList<F extends object, T>({
  state,
  fetchPage,
}: UsePaginatedListOptions<F, T>): UsePaginatedListResult<F, T> {
  const [query, setQuery] = state;
  const [result, setResult] = useState<ApiResult<PagedResult<T>> | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const inFlight = useRef<AbortController | null>(null);
  const requested = useRef(query);
  const { page, pageSize, ...filters } = query;

  function send(next: PaginatedListQuery<F>) {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;

    void fetchPage(next, controller.signal).then((answer) => {
      if (controller.signal.aborted) return;
      if (!answer.ok) {
        setResult(answer);
        return;
      }

      setTotalCount(answer.data.totalCount);
      const lastPage = getLastPage(answer.data.totalCount, next.pageSize);
      if (next.page > lastPage) {
        request({ ...next, page: lastPage });
        return;
      }

      setResult(answer);
    });
  }

  function request(next: PaginatedListQuery<F>) {
    requested.current = next;
    setQuery(next);
    setResult(null);
    send(next);
  }

  const sendFirstPage = useEffectEvent(() => {
    send(query);
  });

  useEffect(() => {
    sendFirstPage();
    return () => {
      inFlight.current?.abort();
    };
  }, []);

  function applyFilters(patch: Partial<F>) {
    setTotalCount(null);
    request({ ...query, ...patch, page: FIRST_PAGE });
  }

  function onPageChange(nextPage: number) {
    request({ ...query, page: nextPage });
  }

  function onPageSizeChange(nextPageSize: number) {
    request({ ...query, page: FIRST_PAGE, pageSize: nextPageSize });
  }

  function onRetry() {
    request(query);
  }

  function refetch() {
    send(requested.current);
  }

  return {
    filters,
    applyFilters,
    refetch,
    list: toListState(result, onRetry),
    pagination: { page, pageSize, totalCount, onPageChange, onPageSizeChange },
  };
}
