import { useEffect, useEffectEvent, useState } from 'react';
import { extractErrorMessage, type ApiResult } from '@/shared/api/servicesFacade';
import {
  DEFAULT_PAGE_SIZE,
  FIRST_PAGE,
  getLastPage,
  type PagedResult,
} from '@/shared/pagination/paging';
import { ListSectionStatus } from '@/widgets/list-section';
import type {
  PaginatedListAnswer,
  PaginatedListKnownTotal,
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
    const { error } = result;
    return {
      status: ListSectionStatus.Error,
      items: [],
      failure: { message: extractErrorMessage(error), code: error.code ?? undefined, onRetry },
    };
  }

  return { status: ListSectionStatus.Ready, items: result.data.items, failure: null };
}

export function usePaginatedList<F extends object, T>({
  initialFilters,
  fetchPage,
}: UsePaginatedListOptions<F, T>): UsePaginatedListResult<F, T> {
  const [query, setQuery] = useState<PaginatedListQuery<F>>({
    filters: initialFilters,
    page: FIRST_PAGE,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const { filters, page, pageSize } = query;
  const filtersKey = JSON.stringify(filters);
  const requestKey = JSON.stringify([filters, page, pageSize]);
  const [answer, setAnswer] = useState<PaginatedListAnswer<T> | null>(null);
  const [knownTotal, setKnownTotal] = useState<PaginatedListKnownTotal | null>(null);
  const [attempt, setAttempt] = useState(0);

  if (answer !== null && answer.requestKey !== requestKey) setAnswer(null);

  const current = answer?.requestKey === requestKey ? answer.result : null;
  const lastPage = current?.ok ? getLastPage(current.data.totalCount, pageSize) : null;

  if (lastPage !== null && page > lastPage) setQuery({ ...query, page: lastPage });

  const fetchCurrentPage = useEffectEvent((signal: AbortSignal) =>
    fetchPage({ ...filters, page, pageSize }, signal),
  );

  useEffect(() => {
    const controller = new AbortController();

    void fetchCurrentPage(controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      setAnswer({ requestKey, result });
      if (result.ok) setKnownTotal({ filtersKey, totalCount: result.data.totalCount });
    });

    return () => {
      controller.abort();
    };
  }, [requestKey, filtersKey, attempt]);

  const totalCount = knownTotal?.filtersKey === filtersKey ? knownTotal.totalCount : null;

  function setFilters(patch: Partial<F>) {
    setQuery({ filters: { ...filters, ...patch }, page: FIRST_PAGE, pageSize });
  }

  function onPageChange(nextPage: number) {
    setQuery({ ...query, page: nextPage });
  }

  function onPageSizeChange(nextPageSize: number) {
    setQuery({ ...query, page: FIRST_PAGE, pageSize: nextPageSize });
  }

  function onRetry() {
    setAnswer(null);
    setAttempt((count) => count + 1);
  }

  return {
    filters,
    setFilters,
    list: toListState(current, onRetry),
    pagination: { page, pageSize, totalCount, onPageChange, onPageSizeChange },
  };
}
