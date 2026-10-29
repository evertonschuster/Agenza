import { useEffect, useRef, useState } from 'react';
import { FIRST_PAGE, getLastPage } from '@/shared/pagination/paging';
import type { SearchSelectItem } from '@/shared/ui/search-select';
import {
  RemoteItemsStatus,
  type LoadRemoteItems,
  type RemoteItemsState,
} from './remote-search-select.types';

export const SEARCH_DELAY_MS = 300;

const IDLE: RemoteItemsState<never> = {
  status: RemoteItemsStatus.Idle,
  search: '',
  page: FIRST_PAGE,
  items: [],
  totalCount: 0,
  problem: null,
};

function appendNew<T extends SearchSelectItem>(current: readonly T[], next: readonly T[]): T[] {
  const known = new Set(current.map((item) => item.id));
  return [...current, ...next.filter((item) => !known.has(item.id))];
}

interface UseRemoteItemsOptions<T> {
  loadItems: LoadRemoteItems<T>;
  pageSize: number;
}

export function useRemoteItems<T extends SearchSelectItem>({
  loadItems,
  pageSize,
}: UseRemoteItemsOptions<T>) {
  const [state, setState] = useState<RemoteItemsState<T>>(IDLE);
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
      inFlight.current?.abort();
    };
  }, []);

  function send(search: string, page: number) {
    cancel();
    const controller = new AbortController();
    inFlight.current = controller;
    setState((current) =>
      page === FIRST_PAGE
        ? { ...IDLE, status: RemoteItemsStatus.Loading, search }
        : { ...current, status: RemoteItemsStatus.LoadingMore, problem: null },
    );

    void loadItems({ search, page, pageSize }, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (!result.ok) {
        setState((current) => ({
          ...current,
          status: RemoteItemsStatus.Error,
          problem: result.error,
        }));
        return;
      }

      setState((current) => ({
        status: RemoteItemsStatus.Ready,
        search,
        page,
        items:
          page === FIRST_PAGE ? result.data.items : appendNew(current.items, result.data.items),
        totalCount: result.data.totalCount,
        problem: null,
      }));
    });
  }

  function open() {
    if (searchTimer.current !== undefined) return;
    send('', FIRST_PAGE);
  }

  function search(text: string) {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => send(text, FIRST_PAGE), SEARCH_DELAY_MS);
  }

  function close() {
    cancel();
    setState(IDLE);
  }

  function loadMore() {
    send(state.search, state.page + 1);
  }

  function retry() {
    const failedPage = state.items.length === 0 ? FIRST_PAGE : state.page + 1;
    send(state.search, failedPage);
  }

  const hasMore =
    state.status !== RemoteItemsStatus.Loading &&
    state.items.length > 0 &&
    state.page < getLastPage(state.totalCount, pageSize);

  return { state, hasMore, open, search, close, loadMore, retry };
}
