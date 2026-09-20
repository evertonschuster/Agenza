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
  const latestRequestRef = useRef(0);

  
  const fetchTags = useCallback((forQuery: string) => {
    const requestId = ++latestRequestRef.current;

    void tagsRepository.list(forQuery || undefined).then((apiResult) => {
      if (requestId !== latestRequestRef.current) return;

      setResult({
        query: forQuery,
        status: apiResult.ok ? 'ready' : 'error',
        tags: apiResult.ok ? apiResult.data : [],
      });
    });
  }, []);

  useEffect(() => {
    fetchTags(query);
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
