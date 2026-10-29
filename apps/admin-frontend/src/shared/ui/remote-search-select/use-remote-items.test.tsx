import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ApiResult } from '@/shared/api/servicesFacade';
import type { PagedResult } from '@/shared/pagination/paging';
import type { RemoteItemsQuery } from './remote-search-select.types';
import { SEARCH_DELAY_MS, useRemoteItems } from './use-remote-items';

interface Item {
  id: string;
  name: string;
}

type Answer = ApiResult<PagedResult<Item>>;

const item = (id: string): Item => ({ id, name: `Item ${id}` });

function page(items: Item[], totalCount: number, pageNumber = 1): Answer {
  return { ok: true, data: { items, totalCount, page: pageNumber, pageSize: 2 } };
}

const FAILURE: Answer = { ok: false, error: { status: 500, code: 'Server', title: 'Falhou.' } };

function deferredLoader() {
  const pending: { query: RemoteItemsQuery; signal: AbortSignal; resolve: (a: Answer) => void }[] =
    [];
  const loadItems = vi.fn(
    (query: RemoteItemsQuery, signal: AbortSignal) =>
      new Promise<Answer>((resolve) => {
        pending.push({ query, signal, resolve });
      }),
  );
  return { loadItems, pending };
}

async function answer(request: { resolve: (a: Answer) => void } | undefined, result: Answer) {
  await act(async () => {
    request?.resolve(result);
    await Promise.resolve();
  });
}

describe('useRemoteItems', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('asks for the first page when opened and keeps what comes back', async () => {
    const { loadItems, pending } = deferredLoader();
    const { result } = renderHook(() => useRemoteItems({ loadItems, pageSize: 2 }));

    act(() => result.current.open());

    expect(result.current.state.status).toBe('loading');
    expect(loadItems).toHaveBeenCalledWith(
      { search: '', page: 1, pageSize: 2 },
      expect.any(AbortSignal),
    );

    await answer(pending[0], page([item('a'), item('b')], 3));

    expect(result.current.state).toMatchObject({ status: 'ready', items: [item('a'), item('b')] });
    expect(result.current.hasMore).toBe(true);
  });

  it('searches only once the typing pauses, with the last text', () => {
    const { loadItems } = deferredLoader();
    const { result } = renderHook(() => useRemoteItems({ loadItems, pageSize: 2 }));

    act(() => {
      result.current.search('v');
      result.current.search('vi');
    });
    act(() => {
      vi.advanceTimersByTime(SEARCH_DELAY_MS - 1);
    });
    expect(loadItems).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(loadItems).toHaveBeenCalledExactlyOnceWith(
      { search: 'vi', page: 1, pageSize: 2 },
      expect.any(AbortSignal),
    );
  });

  it('opening while a typed search waits asks only for that search, not for the whole list', () => {
    const { loadItems } = deferredLoader();
    const { result } = renderHook(() => useRemoteItems({ loadItems, pageSize: 2 }));

    act(() => {
      result.current.search('vi');
      result.current.open();
    });
    act(() => {
      vi.advanceTimersByTime(SEARCH_DELAY_MS);
    });

    expect(loadItems).toHaveBeenCalledExactlyOnceWith(
      { search: 'vi', page: 1, pageSize: 2 },
      expect.any(AbortSignal),
    );
  });

  it('cancels the previous request when a newer one starts, so a late answer never replaces it', async () => {
    const { loadItems, pending } = deferredLoader();
    const { result } = renderHook(() => useRemoteItems({ loadItems, pageSize: 2 }));

    act(() => result.current.open());
    act(() => result.current.search('vi'));
    act(() => {
      vi.advanceTimersByTime(SEARCH_DELAY_MS);
    });

    expect(pending[0]?.signal.aborted).toBe(true);

    await answer(pending[1], page([item('v')], 1));
    await answer(pending[0], page([item('a'), item('b')], 3));

    expect(result.current.state).toMatchObject({
      status: 'ready',
      search: 'vi',
      items: [item('v')],
    });
  });

  it('adds the next page below the current one, without repeating an item that shifted pages', async () => {
    const { loadItems, pending } = deferredLoader();
    const { result } = renderHook(() => useRemoteItems({ loadItems, pageSize: 2 }));

    act(() => result.current.open());
    await answer(pending[0], page([item('a'), item('b')], 4));
    act(() => result.current.loadMore());

    expect(result.current.state.status).toBe('loadingMore');
    expect(loadItems).toHaveBeenLastCalledWith(
      { search: '', page: 2, pageSize: 2 },
      expect.any(AbortSignal),
    );

    await answer(pending[1], page([item('b'), item('c')], 4, 2));

    expect(result.current.state.items).toEqual([item('a'), item('b'), item('c')]);
    expect(result.current.hasMore).toBe(false);
  });

  it('keeps the failure and retries the page that failed', async () => {
    const { loadItems, pending } = deferredLoader();
    const { result } = renderHook(() => useRemoteItems({ loadItems, pageSize: 2 }));

    act(() => result.current.open());
    await answer(pending[0], FAILURE);

    expect(result.current.state).toMatchObject({ status: 'error', problem: { title: 'Falhou.' } });

    act(() => result.current.retry());
    await answer(pending[1], page([item('a'), item('b')], 3));
    act(() => result.current.loadMore());
    await answer(pending[2], FAILURE);
    act(() => result.current.retry());

    expect(loadItems).toHaveBeenLastCalledWith(
      { search: '', page: 2, pageSize: 2 },
      expect.any(AbortSignal),
    );
    expect(result.current.state.items).toEqual([item('a'), item('b')]);
  });

  it('drops the list and the pending work when closed or unmounted', () => {
    const { loadItems, pending } = deferredLoader();
    const { result, unmount } = renderHook(() => useRemoteItems({ loadItems, pageSize: 2 }));

    act(() => result.current.open());
    act(() => result.current.close());

    expect(pending[0]?.signal.aborted).toBe(true);
    expect(result.current.state).toMatchObject({ status: 'idle', items: [] });

    act(() => result.current.search('vi'));
    unmount();
    act(() => {
      vi.advanceTimersByTime(SEARCH_DELAY_MS);
    });

    expect(loadItems).toHaveBeenCalledTimes(1);
  });
});
