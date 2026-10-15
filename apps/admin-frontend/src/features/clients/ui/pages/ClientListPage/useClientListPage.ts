import { useCallback, useEffect, useRef, useState, type SubmitEvent } from 'react';
import { useSearchParams } from 'react-router';
import { extractErrorMessage, type ApiResult } from '@/shared/api/servicesFacade';
import { FIRST_PAGE, getLastPage, readPaging, withPaging } from '@/shared/pagination/paging';
import { ListSectionStatus } from '@/widgets/list-section';
import { clientsRepository, type ClientListQuery } from '../../../api/clientsRepository';
import type { ClientList } from '../../../model/clientList';
import type {
  ClientListState,
  LoadResult,
  UseClientListPageResult,
} from './useClientListPage.types';

function isSameRequest(left: ClientListQuery, right: ClientListQuery): boolean {
  return (
    left.search === right.search && left.page === right.page && left.pageSize === right.pageSize
  );
}

export function useClientListPage(): UseClientListPageResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const { page, pageSize } = readPaging(searchParams);
  const [loaded, setLoaded] = useState<LoadResult | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchClients = useCallback((request: ClientListQuery) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    void clientsRepository.list(request, controller.signal).then((apiResult) => {
      if (controller.signal.aborted) return;
      if (apiResult.ok) setTotalCount(apiResult.data.totalCount);
      setLoaded({ request, apiResult });
    });
  }, []);

  useEffect(() => {
    fetchClients({ search: query, page, pageSize });
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [query, page, pageSize, fetchClients]);

  useEffect(() => {
    const input = searchInputRef.current;
    if (input && input.value !== query) input.value = query;
  }, [query]);

  const request: ClientListQuery = { search: query, page, pageSize };
  const current = loaded && isSameRequest(loaded.request, request) ? loaded.apiResult : null;
  const lastPage = current?.ok ? getLastPage(current.data.totalCount, pageSize) : null;
  const pastLastPage = lastPage !== null && page > lastPage;
  const canonicalSearch = withPaging(searchParams, {
    page: pastLastPage ? lastPage : page,
    pageSize,
  }).toString();

  useEffect(() => {
    if (canonicalSearch === searchParams.toString()) return;
    setSearchParams(new URLSearchParams(canonicalSearch), { replace: true });
  }, [canonicalSearch, searchParams, setSearchParams]);

  function onSearchChange(nextSearch: string) {
    const next = new URLSearchParams(searchParams);
    if (nextSearch) next.set('q', nextSearch);
    else next.delete('q');
    setSearchParams(withPaging(next, { page: FIRST_PAGE, pageSize }));
  }

  function onSearchSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearchChange(searchInputRef.current?.value ?? '');
  }

  function onClearSearch() {
    onSearchChange('');
  }

  function onPageChange(nextPage: number) {
    setSearchParams(withPaging(searchParams, { page: nextPage, pageSize }));
  }

  function onPageSizeChange(nextPageSize: number) {
    setSearchParams(withPaging(searchParams, { page: FIRST_PAGE, pageSize: nextPageSize }));
  }

  function onRetry() {
    setLoaded(null);
    fetchClients(request);
  }

  function toListState(apiResult: ApiResult<ClientList> | null): ClientListState {
    if (apiResult === null) {
      return { status: ListSectionStatus.Loading, clients: [], failure: null };
    }

    if (!apiResult.ok) {
      const { error } = apiResult;
      return {
        status: ListSectionStatus.Error,
        clients: [],
        failure: { message: extractErrorMessage(error), code: error.code ?? undefined },
      };
    }

    return { status: ListSectionStatus.Ready, clients: apiResult.data.items, failure: null };
  }

  return {
    ...toListState(pastLastPage ? null : current),
    query,
    paging: { page, pageSize, totalCount: pastLastPage ? null : totalCount },
    searchInputRef,
    onSearchSubmit,
    onClearSearch,
    onRetry,
    onPageChange,
    onPageSizeChange,
  };
}
