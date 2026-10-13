import { useCallback, useEffect, useRef, useState, type SubmitEvent } from 'react';
import { useSearchParams } from 'react-router';
import { extractErrorMessage } from '@/shared/api/servicesFacade';
import { ListSectionStatus } from '@/widgets/list-section';
import { clientsRepository } from '../../../api/clientsRepository';
import type { LoadResult, UseClientListPageResult } from './useClientListPage.types';

export function useClientListPage(): UseClientListPageResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const [result, setResult] = useState<LoadResult | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchClients = useCallback((forQuery: string) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    void clientsRepository.list(forQuery || undefined, controller.signal).then((apiResult) => {
      if (controller.signal.aborted) return;

      if (!apiResult.ok) {
        setResult({
          query: forQuery,
          status: ListSectionStatus.Error,
          clients: [],
          totalCount: 0,
          problem: apiResult.error,
        });
        return;
      }

      setResult({
        query: forQuery,
        status: ListSectionStatus.Ready,
        clients: apiResult.data.items,
        totalCount: apiResult.data.totalCount,
        problem: null,
      });
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

  const current = result !== null && result.query === query ? result : null;
  const clients = current?.clients ?? [];
  const problem = current?.problem ?? null;

  return {
    status: current?.status ?? ListSectionStatus.Loading,
    clients,
    failure: problem && { message: extractErrorMessage(problem), code: problem.code ?? undefined },
    query,
    searchInputRef,
    onSearchSubmit,
    onClearSearch: () => setSearchParams({}),
    onRetry: () => {
      setResult(null);
      fetchClients(query);
    },
  };
}
