import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { useSearchParams } from 'react-router';
import { tagsRepository } from '../../../api/tagsRepository';
import type { LoadResult, UseTagListPageResult } from './useTagListPage.types';

export function useTagListPage(): UseTagListPageResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const [result, setResult] = useState<LoadResult | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let ignore = false;

    void tagsRepository.list(query || undefined).then((apiResult) => {
      if (ignore) return;

      setResult({
        query,
        reloadToken,
        status: apiResult.ok ? 'ready' : 'error',
        tags: apiResult.ok ? apiResult.data : [],
      });
    });

    return () => {
      ignore = true;
    };
  }, [query, reloadToken]);

  function onSearchSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = searchInputRef.current?.value ?? '';
    setSearchParams(nextQuery ? { q: nextQuery } : {});
  }

  const isCurrent = result !== null && result.query === query && result.reloadToken === reloadToken;

  return {
    status: isCurrent ? result.status : 'loading',
    tags: isCurrent ? result.tags : [],
    query,
    searchInputRef,
    onSearchSubmit,
    reload: () => setReloadToken((token) => token + 1),
  };
}
