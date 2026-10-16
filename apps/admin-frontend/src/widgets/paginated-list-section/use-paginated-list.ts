import { useEffect, useEffectEvent, useState } from 'react';
import { useSearchParams } from 'react-router';
import { extractErrorMessage, type ApiResult } from '@/shared/api/servicesFacade';
import { withFilters, type ListFilters } from '@/shared/pagination/filters';
import {
  FIRST_PAGE,
  getLastPage,
  readPaging,
  withPaging,
  type PagedResult,
} from '@/shared/pagination/paging';
import { ListSectionStatus } from '@/widgets/list-section';
import type {
  PaginatedListState,
  UsePaginatedListOptions,
  UsePaginatedListResult,
} from './paginated-list-section.types';

interface Answer<T> {
  requestKey: string;
  result: ApiResult<PagedResult<T>>;
}

interface KnownTotal {
  filtersKey: string;
  totalCount: number;
}

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

export function usePaginatedList<F extends ListFilters<F>, T>({
  readFilters,
  fetchPage,
}: UsePaginatedListOptions<F, T>): UsePaginatedListResult<F, T> {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readFilters(searchParams);
  const { page, pageSize } = readPaging(searchParams);
  const filtersKey = withFilters(new URLSearchParams(), filters).toString();
  const requestKey = withPaging(new URLSearchParams(filtersKey), { page, pageSize }).toString();
  const [answer, setAnswer] = useState<Answer<T> | null>(null);
  const [knownTotal, setKnownTotal] = useState<KnownTotal | null>(null);
  const [attempt, setAttempt] = useState(0);

  if (answer !== null && answer.requestKey !== requestKey) setAnswer(null);

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

  const current = answer?.requestKey === requestKey ? answer.result : null;
  const lastPage = current?.ok ? getLastPage(current.data.totalCount, pageSize) : null;
  const pastLastPage = lastPage !== null && page > lastPage;
  const canonicalSearch = withPaging(withFilters(searchParams, filters), {
    page: pastLastPage ? lastPage : page,
    pageSize,
  }).toString();

  useEffect(() => {
    if (canonicalSearch === searchParams.toString()) return;
    setSearchParams(new URLSearchParams(canonicalSearch), { replace: true });
  }, [canonicalSearch, searchParams, setSearchParams]);

  const totalCount =
    !pastLastPage && knownTotal?.filtersKey === filtersKey ? knownTotal.totalCount : null;

  function setFilters(patch: Partial<F>) {
    const next = withFilters(searchParams, { ...filters, ...patch });
    setSearchParams(withPaging(next, { page: FIRST_PAGE, pageSize }));
  }

  function onPageChange(nextPage: number) {
    setSearchParams(withPaging(searchParams, { page: nextPage, pageSize }));
  }

  function onPageSizeChange(nextPageSize: number) {
    setSearchParams(withPaging(searchParams, { page: FIRST_PAGE, pageSize: nextPageSize }));
  }

  function onRetry() {
    setAnswer(null);
    setAttempt((count) => count + 1);
  }

  return {
    filters,
    setFilters,
    list: toListState(pastLastPage ? null : current, onRetry),
    pagination: { page, pageSize, totalCount, onPageChange, onPageSizeChange },
  };
}
