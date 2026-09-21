import { useCallback, useEffect, useRef, useState, type SubmitEvent } from 'react';
import { useSearchParams } from 'react-router';
import { useTopic } from '@/shared/pubsub/useTopic';
import { tagsRepository } from '../../../api/tagsRepository';
import { tagDeleted } from '../../../model/tagEvents';
import type { LoadResult, UseTagListPageResult } from './useTagListPage.types';

export function useTagListPage(): UseTagListPageResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const [result, setResult] = useState<LoadResult | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchTags = useCallback((forQuery: string) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    void tagsRepository.list(forQuery || undefined, controller.signal).then((apiResult) => {
      if (controller.signal.aborted) return;

      setResult({
        query: forQuery,
        status: apiResult.ok ? 'ready' : 'error',
        tags: apiResult.ok ? apiResult.data : [],
      });
    });
  }, []);

  useEffect(() => {
    fetchTags(query);
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [query, fetchTags]);

  useTopic(tagDeleted, () => fetchTags(query));

  function onSearchSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = searchInputRef.current?.value ?? '';
    setSearchParams(nextQuery ? { q: nextQuery } : {});
  }

  const isCurrent = result !== null && result.query === query;

  return {
    status: isCurrent ? result.status : 'loading',
    tags: isCurrent ? result.tags : [],
    query,
    searchInputRef,
    onSearchSubmit,
  };
}
