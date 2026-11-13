import { useEffect, useRef, useState, type RefObject } from 'react';
import { FIRST_PAGE, getLastPage } from '@/shared/pagination/paging';
import type {
  SearchItemsQuery,
  SearchOptionsState,
  SearchSelectItem,
  SearchTimer,
  UseSearchOptionsArgs,
} from './search-select.types';

export const SEARCH_DELAY_MS = 300;

const UNLOADED: SearchOptionsState<never> = {
  searched: '',
  items: [],
  totalCount: 0,
  next: null,
  phase: { kind: 'loadingFirst' },
};

function cancelPending(timer: RefObject<SearchTimer>, inFlight: RefObject<AbortController | null>) {
  clearTimeout(timer.current);
  timer.current = undefined;
  inFlight.current?.abort();
  inFlight.current = null;
}

function appendNew<T extends SearchSelectItem>(current: readonly T[], page: readonly T[]): T[] {
  const known = new Set(current.map((item) => item.id));
  return [...current, ...page.filter((item) => !known.has(item.id))];
}

export function useSearchOptions<T extends SearchSelectItem>(args: UseSearchOptionsArgs<T>) {
  const { loadItems, pageSize } = args;
  const [state, setState] = useState<SearchOptionsState<T>>(UNLOADED);
  const inFlight = useRef<AbortController | null>(null);
  const searchTimer = useRef<SearchTimer>(undefined);

  useEffect(() => {
    return () => cancelPending(searchTimer, inFlight);
  }, []);

  function cancel() {
    cancelPending(searchTimer, inFlight);
  }

  function firstPage(search: string): SearchItemsQuery {
    return { search, page: FIRST_PAGE, pageSize };
  }

  function send(query: SearchItemsQuery) {
    cancel();
    const controller = new AbortController();
    inFlight.current = controller;
    const isFirstPage = query.page === FIRST_PAGE;
    setState((current) => {
      if (isFirstPage) return { ...UNLOADED, searched: query.search };
      return { ...current, phase: { kind: 'loadingNext' } };
    });

    void loadItems(query, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      inFlight.current = null;
      if (!result.ok) {
        setState((current) => ({
          ...current,
          phase: { kind: 'failed', problem: result.error, retry: query },
        }));
        return;
      }

      const { items, totalCount } = result.data;
      const hasNext = query.page < getLastPage(totalCount, result.data.pageSize);
      setState((current) => ({
        searched: query.search,
        items: isFirstPage ? items : appendNew(current.items, items),
        totalCount,
        next: hasNext ? { ...query, page: query.page + 1 } : null,
        phase: { kind: 'ready' },
      }));
    });
  }

  function open() {
    if (searchTimer.current !== undefined) return;
    send(firstPage(''));
  }

  function search(text: string) {
    cancel();
    searchTimer.current = setTimeout(() => send(firstPage(text)), SEARCH_DELAY_MS);
  }

  function loadMore() {
    if (inFlight.current || searchTimer.current !== undefined) return;
    if (!state.next || state.phase.kind !== 'ready') return;
    send(state.next);
  }

  function retry() {
    if (searchTimer.current !== undefined) return;
    if (state.phase.kind !== 'failed') return;
    send(state.phase.retry);
  }

  function reset() {
    setState(UNLOADED);
  }

  return { ...state, hasMore: state.next !== null, open, search, loadMore, retry, cancel, reset };
}
