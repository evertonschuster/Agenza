import { useEffect, useEffectEvent, useRef, useState, type SubmitEvent } from 'react';
import { extractErrorMessage, type ApiResult } from '@/shared/api/servicesFacade';
import { useTopic } from '@/shared/pubsub/useTopic';
import { ListSectionStatus } from '@/widgets/list-section';
import { tagsRepository } from '../../../api/tagsRepository';
import type { Tag } from '../../../model/tag';
import { tagDeleted, tagSaved } from '../../../model/tagEvents';
import type { TagListState, UseTagListPageResult } from './useTagListPage.types';

function toListState(result: ApiResult<Tag[]> | null): TagListState {
  if (result === null) {
    return { status: ListSectionStatus.Loading, tags: [], failure: null };
  }

  if (!result.ok) {
    const { error } = result;
    return {
      status: ListSectionStatus.Error,
      tags: [],
      failure: { message: extractErrorMessage(error), code: error.code ?? undefined },
    };
  }

  return { status: ListSectionStatus.Ready, tags: result.data, failure: null };
}

export function useTagListPage(): UseTagListPageResult {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ApiResult<Tag[]> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const inFlight = useRef<AbortController | null>(null);

  function send(forQuery: string) {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;

    void tagsRepository.list(forQuery || undefined, controller.signal).then((answer) => {
      if (controller.signal.aborted) return;
      setResult(answer);
    });
  }

  function request(nextQuery: string) {
    setQuery(nextQuery);
    setResult(null);
    send(nextQuery);
  }

  const sendFirstSearch = useEffectEvent(() => {
    send(query);
  });

  useEffect(() => {
    sendFirstSearch();
    return () => {
      inFlight.current?.abort();
    };
  }, []);

  useTopic(tagDeleted, () => send(query));
  useTopic(tagSaved, () => send(query));

  function onSearchSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    request(searchInputRef.current?.value ?? '');
  }

  function onClearSearch() {
    if (searchInputRef.current) searchInputRef.current.value = '';
    request('');
  }

  return {
    ...toListState(result),
    query,
    searchInputRef,
    onSearchSubmit,
    onClearSearch,
    onRetry: () => request(query),
  };
}
