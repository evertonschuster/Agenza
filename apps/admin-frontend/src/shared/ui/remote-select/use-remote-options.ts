import { useEffect, useRef, useState } from 'react';
import type { ApiProblem } from '@/shared/api/servicesFacade';
import { FIRST_PAGE, getLastPage } from '@/shared/pagination/paging';
import type { LoadRemoteItems, RemoteItemsQuery, RemoteSelectItem } from './remote-select.types';

export const SEARCH_DELAY_MS = 300;

interface RemoteOptionsState<T> {
  searched: string;
  items: readonly T[];
  totalCount: number;
  loading: 'first' | 'next' | null;
  next: RemoteItemsQuery | null;
  problem: ApiProblem | null;
}

const UNLOADED: RemoteOptionsState<never> = {
  searched: '',
  items: [],
  totalCount: 0,
  loading: 'first',
  next: null,
  problem: null,
};

function appendNew<T extends RemoteSelectItem>(current: readonly T[], page: readonly T[]): T[] {
  const known = new Set(current.map((item) => item.id));
  return [...current, ...page.filter((item) => !known.has(item.id))];
}

interface UseRemoteOptionsArgs<T> {
  loadItems: LoadRemoteItems<T>;
  pageSize: number;
}

export function useRemoteOptions<T extends RemoteSelectItem>(args: UseRemoteOptionsArgs<T>) {
  const { loadItems, pageSize } = args;
  const [state, setState] = useState<RemoteOptionsState<T>>(UNLOADED);
  const inFlight = useRef<AbortController | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function cancel() {
    clearTimeout(searchTimer.current);
    searchTimer.current = undefined;
    inFlight.current?.abort();
    inFlight.current = null;
  }

  useEffect(() => {
    return () => {
      clearTimeout(searchTimer.current);
      searchTimer.current = undefined;
      inFlight.current?.abort();
      inFlight.current = null;
    };
  }, []);

  function firstPage(search: string): RemoteItemsQuery {
    return { search, page: FIRST_PAGE, pageSize };
  }

  function send(query: RemoteItemsQuery) {
    cancel();
    const controller = new AbortController();
    inFlight.current = controller;
    const isFirstPage = query.page === FIRST_PAGE;
    setState((current) => {
      if (isFirstPage) return { ...UNLOADED, searched: query.search };
      return { ...current, loading: 'next', problem: null };
    });

    void loadItems(query, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      inFlight.current = null;
      if (!result.ok) {
        setState((current) => ({ ...current, loading: null, problem: result.error }));
        return;
      }

      const { items, totalCount } = result.data;
      const hasNext = query.page < getLastPage(totalCount, result.data.pageSize);
      setState((current) => ({
        searched: query.search,
        items: isFirstPage ? items : appendNew(current.items, items),
        totalCount,
        loading: null,
        next: hasNext ? { ...query, page: query.page + 1 } : null,
        problem: null,
      }));
    });
  }

  function open() {
    if (searchTimer.current !== undefined) return;
    send(firstPage(''));
  }

  function search(text: string) {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => send(firstPage(text)), SEARCH_DELAY_MS);
  }

  function loadMore() {
    if (inFlight.current || searchTimer.current !== undefined) return;
    if (!state.next || state.loading || state.problem) return;
    send(state.next);
  }

  function retry() {
    send(state.next ?? firstPage(state.searched));
  }

  function close() {
    cancel();
  }

  function reset() {
    setState(UNLOADED);
  }

  return { ...state, hasMore: state.next !== null, open, search, loadMore, retry, close, reset };
}
