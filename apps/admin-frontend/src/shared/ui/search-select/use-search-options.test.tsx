import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ApiProblem, ApiResult } from '@/shared/api/servicesFacade';
import type { PagedResult } from '@/shared/pagination/paging';
import { fail, ok } from '@/shared/result';
import type { SearchItemsQuery, SearchSelectItem } from './search-select.types';
import { SEARCH_DELAY_MS, useSearchOptions } from './use-search-options';

type Answer = ApiResult<PagedResult<SearchSelectItem>>;

const PAGE_SIZE = 2;
const PROBLEM: ApiProblem = { status: 500, code: 'Server', title: 'O servidor falhou.' };

const item = (n: number): SearchSelectItem => ({ id: `t${n}`, name: `Etiqueta ${n}` });

function pageOf(items: SearchSelectItem[], totalCount: number, page = 1): Answer {
  return ok({ items, totalCount, page, pageSize: PAGE_SIZE });
}

function deferred() {
  let settle: (answer: Answer) => void = () => {};
  const promise = new Promise<Answer>((resolve) => {
    settle = resolve;
  });
  return { promise, settle };
}

function setup() {
  const loadItems = vi.fn<(query: SearchItemsQuery, signal: AbortSignal) => Promise<Answer>>();
  const hook = renderHook(() => useSearchOptions({ loadItems, pageSize: PAGE_SIZE }));
  return { loadItems, hook, current: () => hook.result.current };
}

async function settled() {
  await act(async () => {});
}

const query = (search: string, page = 1) => ({ search, page, pageSize: PAGE_SIZE });

describe('useSearchOptions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('asks for the first page without a search when opened and keeps what comes back', async () => {
    const { loadItems, current } = setup();
    loadItems.mockResolvedValue(pageOf([item(1), item(2)], 5));

    act(() => current().open());
    expect(current().phase).toEqual({ kind: 'loadingFirst' });
    await settled();

    expect(loadItems).toHaveBeenCalledWith(query(''), expect.any(AbortSignal));
    expect(current()).toMatchObject({
      phase: { kind: 'ready' },
      items: [item(1), item(2)],
      totalCount: 5,
      hasMore: true,
    });
  });

  it('searches once the typing pauses, with the last text', async () => {
    const { loadItems, current } = setup();
    loadItems.mockResolvedValue(pageOf([item(3)], 1));

    act(() => current().search('e'));
    act(() => current().search('et'));
    act(() => {
      vi.advanceTimersByTime(SEARCH_DELAY_MS - 1);
    });
    expect(loadItems).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    await settled();

    expect(loadItems).toHaveBeenCalledTimes(1);
    expect(loadItems).toHaveBeenCalledWith(query('et'), expect.any(AbortSignal));
    expect(current()).toMatchObject({ searched: 'et', items: [item(3)], hasMore: false });
  });

  it('opened by a typed search that is still waiting, asks only for that search', async () => {
    const { loadItems, current } = setup();
    loadItems.mockResolvedValue(pageOf([], 0));

    act(() => current().search('vi'));
    act(() => current().open());
    expect(current().phase).toEqual({ kind: 'loadingFirst' });
    act(() => {
      vi.advanceTimersByTime(SEARCH_DELAY_MS);
    });
    await settled();

    expect(loadItems).toHaveBeenCalledTimes(1);
    expect(loadItems).toHaveBeenCalledWith(query('vi'), expect.any(AbortSignal));
  });

  it('cancels the request a newer one replaces and ignores its late answer', async () => {
    const { loadItems, current } = setup();
    const first = deferred();
    loadItems.mockReturnValueOnce(first.promise).mockResolvedValueOnce(pageOf([item(9)], 1));

    act(() => current().open());
    act(() => current().search('nove'));
    act(() => {
      vi.advanceTimersByTime(SEARCH_DELAY_MS);
    });
    await settled();
    first.settle(pageOf([item(1)], 1));
    await settled();

    expect(loadItems.mock.calls[0]?.[1].aborted).toBe(true);
    expect(current()).toMatchObject({ searched: 'nove', items: [item(9)] });
  });

  it('appends the next page without repeating an item that shifted pages, up to the last one', async () => {
    const { loadItems, current } = setup();
    loadItems
      .mockResolvedValueOnce(pageOf([item(1), item(2)], 3))
      .mockResolvedValueOnce(pageOf([item(2), item(3)], 3, 2));

    act(() => current().open());
    await settled();
    act(() => current().loadMore());
    expect(current().phase).toEqual({ kind: 'loadingNext' });
    await settled();

    expect(loadItems).toHaveBeenLastCalledWith(query('', 2), expect.any(AbortSignal));
    expect(current()).toMatchObject({ items: [item(1), item(2), item(3)], hasMore: false });

    act(() => current().loadMore());
    expect(loadItems).toHaveBeenCalledTimes(2);
  });

  it('asks for nothing more while a page loads or while a typed search waits', async () => {
    const { loadItems, current } = setup();
    const next = deferred();
    loadItems
      .mockResolvedValueOnce(pageOf([item(1), item(2)], 6))
      .mockReturnValueOnce(next.promise);

    act(() => current().open());
    await settled();
    act(() => {
      current().loadMore();
      current().loadMore();
    });
    expect(loadItems).toHaveBeenCalledTimes(2);

    next.settle(pageOf([item(3), item(4)], 6, 2));
    await settled();
    act(() => current().search('x'));
    act(() => current().loadMore());
    expect(loadItems).toHaveBeenCalledTimes(2);
  });

  it('ignores a request for more made by a render older than the page that just arrived', async () => {
    const { loadItems, current } = setup();
    const next = deferred();
    loadItems
      .mockResolvedValueOnce(pageOf([item(1), item(2)], 6))
      .mockReturnValueOnce(next.promise);

    act(() => current().open());
    await settled();
    act(() => current().loadMore());
    const loadMoreFromThatRender = current().loadMore;
    next.settle(pageOf([item(3), item(4)], 6, 2));
    await settled();
    act(() => loadMoreFromThatRender());

    expect(loadItems).toHaveBeenCalledTimes(2);
  });

  it('asks for nothing more after the next page fails, until it is retried', async () => {
    const { loadItems, current } = setup();
    loadItems
      .mockResolvedValueOnce(pageOf([item(1), item(2)], 6))
      .mockResolvedValueOnce(fail(PROBLEM));

    act(() => current().open());
    await settled();
    act(() => current().loadMore());
    await settled();
    expect(current()).toMatchObject({ phase: { kind: 'failed', problem: PROBLEM }, hasMore: true });

    act(() => current().loadMore());
    expect(loadItems).toHaveBeenCalledTimes(2);
  });

  it('has nothing to retry while no request has failed', async () => {
    const { loadItems, current } = setup();
    loadItems.mockResolvedValueOnce(pageOf([item(1)], 1));

    act(() => current().open());
    await settled();
    act(() => current().retry());

    expect(loadItems).toHaveBeenCalledTimes(1);
  });

  it('stops at the last page the server reports, even when it pages by less than asked', async () => {
    const { loadItems, current } = setup();
    loadItems.mockResolvedValueOnce(ok({ items: [item(1)], totalCount: 2, page: 1, pageSize: 1 }));

    act(() => current().open());
    await settled();

    expect(current().hasMore).toBe(true);
  });

  it('keeps a failed first page and retries it with the same search', async () => {
    const { loadItems, current } = setup();
    loadItems.mockResolvedValueOnce(fail(PROBLEM)).mockResolvedValueOnce(pageOf([item(1)], 1));

    act(() => current().search('um'));
    act(() => {
      vi.advanceTimersByTime(SEARCH_DELAY_MS);
    });
    await settled();
    expect(current()).toMatchObject({
      items: [],
      phase: { kind: 'failed', problem: PROBLEM, retry: query('um') },
    });

    act(() => current().retry());
    await settled();

    expect(loadItems).toHaveBeenLastCalledWith(query('um'), expect.any(AbortSignal));
    expect(current()).toMatchObject({ items: [item(1)], phase: { kind: 'ready' } });
  });

  it('keeps the items when the next page fails and retries that page', async () => {
    const { loadItems, current } = setup();
    loadItems
      .mockResolvedValueOnce(pageOf([item(1), item(2)], 3))
      .mockResolvedValueOnce(fail(PROBLEM))
      .mockResolvedValueOnce(pageOf([item(3)], 3, 2));

    act(() => current().open());
    await settled();
    act(() => current().loadMore());
    await settled();
    expect(current()).toMatchObject({
      items: [item(1), item(2)],
      phase: { kind: 'failed', problem: PROBLEM, retry: query('', 2) },
      hasMore: true,
    });

    act(() => current().retry());
    await settled();

    expect(loadItems).toHaveBeenLastCalledWith(query('', 2), expect.any(AbortSignal));
    expect(current()).toMatchObject({
      items: [item(1), item(2), item(3)],
      phase: { kind: 'ready' },
    });
  });

  it('cancels the pending work, drops the list once reset, and cancels on unmount', async () => {
    const { loadItems, hook, current } = setup();
    loadItems.mockResolvedValueOnce(pageOf([item(1)], 1)).mockReturnValue(deferred().promise);

    act(() => current().open());
    await settled();
    act(() => current().search('a'));
    act(() => current().cancel());
    act(() => {
      vi.advanceTimersByTime(SEARCH_DELAY_MS);
    });

    expect(loadItems).toHaveBeenCalledTimes(1);
    expect(current().items).toEqual([item(1)]);

    act(() => current().reset());
    expect(current()).toMatchObject({ items: [], phase: { kind: 'loadingFirst' }, searched: '' });

    act(() => current().open());
    const signal = loadItems.mock.calls[1]?.[1];
    hook.unmount();
    expect(signal?.aborted).toBe(true);
  });
});
