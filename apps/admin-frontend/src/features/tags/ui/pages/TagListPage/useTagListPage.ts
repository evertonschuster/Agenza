import { useCallback, useEffect, useRef, useState, type SubmitEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { useShortcut } from '@/shared/keyboard/useShortcut';
import { useTopic } from '@/shared/pubsub/useTopic';
import { ListSectionStatus } from '@/shared/ui/list-section';
import { tagsRepository } from '../../../api/tagsRepository';
import { tagDeleted, tagSaved } from '../../../model/tagEvents';
import type { LoadResult, UseTagListPageResult } from './useTagListPage.types';

export const NEW_TAG_SHORTCUT_ID = 'nova-etiqueta';

export function useTagListPage(): UseTagListPageResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const [result, setResult] = useState<LoadResult | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const fetchTags = useCallback((forQuery: string) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    void tagsRepository.list(forQuery || undefined, controller.signal).then((apiResult) => {
      if (controller.signal.aborted) return;

      setResult({
        query: forQuery,
        status: apiResult.ok ? ListSectionStatus.Ready : ListSectionStatus.Error,
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
  useTopic(tagSaved, () => fetchTags(query));

  const newTagTo = { pathname: 'new', search: location.search };
  useShortcut(NEW_TAG_SHORTCUT_ID, 'n', 'Nova etiqueta', () => void navigate(newTagTo));

  function onSearchSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = searchInputRef.current?.value ?? '';
    setSearchParams(nextQuery ? { q: nextQuery } : {});
  }

  const isCurrent = result !== null && result.query === query;

  return {
    status: isCurrent ? result.status : ListSectionStatus.Loading,
    tags: isCurrent ? result.tags : [],
    query,
    searchInputRef,
    onSearchSubmit,
    newTagTo,
  };
}
