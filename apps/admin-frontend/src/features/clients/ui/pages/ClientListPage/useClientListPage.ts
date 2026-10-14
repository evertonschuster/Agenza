import { useCallback, useEffect, useRef, useState, type SubmitEvent } from 'react';
import { useSearchParams } from 'react-router';
import { extractErrorMessage, type ApiResult } from '@/shared/api/servicesFacade';
import { ListSectionStatus } from '@/widgets/list-section';
import { clientsRepository } from '../../../api/clientsRepository';
import type { ClientList } from '../../../model/clientList';
import type {
  ClientListState,
  LoadResult,
  UseClientListPageResult,
} from './useClientListPage.types';

export function useClientListPage(): UseClientListPageResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const [loaded, setLoaded] = useState<LoadResult | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchClients = useCallback((forQuery: string) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    void clientsRepository.list(forQuery || undefined, controller.signal).then((apiResult) => {
      if (controller.signal.aborted) return;
      setLoaded({ query: forQuery, apiResult });
    });
  }, []);

  useEffect(() => {
    fetchClients(query);
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [query, fetchClients]);

  useEffect(() => {
    const input = searchInputRef.current;
    if (input && input.value !== query) input.value = query;
  }, [query]);

  function onSearchSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = searchInputRef.current?.value ?? '';
    setSearchParams(nextQuery ? { q: nextQuery } : {});
  }

  function onClearSearch() {
    setSearchParams({});
  }

  function onRetry() {
    setLoaded(null);
    fetchClients(query);
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

  const current = loaded?.query === query ? loaded.apiResult : null;

  return {
    ...toListState(current),
    query,
    searchInputRef,
    onSearchSubmit,
    onClearSearch,
    onRetry,
  };
}
