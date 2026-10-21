import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { extractErrorMessage, type ApiResult } from '@/shared/api/servicesFacade';
import { useCooldown } from '@/shared/hooks/useCooldown';
import {
  DEFAULT_PAGE_SIZE,
  FIRST_PAGE,
  getLastPage,
  type PagedResult,
} from '@/shared/pagination/paging';
import { ListSectionStatus } from '@/widgets/list-section';
import type {
  PaginatedListKnownTotal,
  PaginatedListQuery,
  PaginatedListState,
  UsePaginatedListOptions,
  UsePaginatedListResult,
} from './paginated-list-section.types';

function toListState<T>(
  result: ApiResult<PagedResult<T>> | null,
  onRetry: () => void,
  retryInSeconds: number,
): PaginatedListState<T> {
  if (result === null) {
    return { status: ListSectionStatus.Loading, items: [], failure: null };
  }

  if (!result.ok) {
    const { error } = result;
    return {
      status: ListSectionStatus.Error,
      items: [],
      failure: {
        message: extractErrorMessage(error),
        code: error.code ?? undefined,
        onRetry,
        retryInSeconds,
      },
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
  const [result, setResult] = useState<ApiResult<PagedResult<T>> | null>(null);
  const [knownTotal, setKnownTotal] = useState<PaginatedListKnownTotal<F> | null>(null);
  const [retryInSeconds, startCooldown] = useCooldown();
  const inFlight = useRef<AbortController | null>(null);
  const requested = useRef(query);
  const { filters, page, pageSize } = query;

  function send(next: PaginatedListQuery<F>) {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;

    void fetchPage(
      { ...next.filters, page: next.page, pageSize: next.pageSize },
      controller.signal,
    ).then((answer) => {
      if (controller.signal.aborted) return;
      if (!answer.ok) {
        startCooldown(answer.error.retryAfterSeconds ?? 0);
        setResult(answer);
        return;
      }

      setKnownTotal({ filters: next.filters, totalCount: answer.data.totalCount });
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
    request({ filters: { ...filters, ...patch }, page: FIRST_PAGE, pageSize });
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

  const totalCount = knownTotal?.filters === filters ? knownTotal.totalCount : null;

  return {
    filters,
    applyFilters,
    refetch,
    list: toListState(result, onRetry, retryInSeconds),
    pagination: { page, pageSize, totalCount, onPageChange, onPageSizeChange },
  };
}
