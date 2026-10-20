import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { NETWORK_PROBLEM, type ApiResult } from '@/shared/api/servicesFacade';
import type { PagedResult, Paging } from '@/shared/pagination/paging';
import { usePaginatedList } from './use-paginated-list';

interface Item {
  id: string;
}

interface Filters {
  q: string;
  situation: 'open' | 'closed' | null;
  pending: boolean;
  tag: string[];
  minAge: number | null;
}

type FetchPage = (
  query: Filters & Paging,
  signal: AbortSignal,
) => Promise<ApiResult<PagedResult<Item>>>;

const NO_FILTERS: Filters = { q: '', situation: null, pending: false, tag: [], minAge: null };

function pageOf(totalCount: number, items: Item[] = [{ id: '1' }]): ApiResult<PagedResult<Item>> {
  return { ok: true, data: { items, totalCount, page: 1, pageSize: 20 } };
}

function renderList(
  initialFilters: Filters = NO_FILTERS,
  fetchPage = vi.fn<FetchPage>(() => Promise.resolve(pageOf(87))),
) {
  const view = renderHook(() => usePaginatedList({ initialFilters, fetchPage }));
  return { ...view, fetchPage };
}

describe('usePaginatedList', () => {
  it('asks for the initial filters on the first page at the default size, with no router around it', async () => {
    const initialFilters: Filters = {
      q: 'ana',
      situation: 'open',
      pending: true,
      tag: ['a', 'b'],
      minAge: 18,
    };
    const { result, fetchPage } = renderList(initialFilters);

    await waitFor(() => expect(result.current.list.status).toBe('ready'));
    expect(result.current.filters).toEqual(initialFilters);
    expect(result.current.pagination).toMatchObject({ page: 1, pageSize: 20, totalCount: 87 });
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith(
      { ...initialFilters, page: 1, pageSize: 20 },
      expect.any(AbortSignal),
    );
  });

  it('merges a change of filters into the ones it has and starts over on the first page, keeping the size', async () => {
    const { result, fetchPage } = renderList();
    await waitFor(() => expect(result.current.list.status).toBe('ready'));
    act(() => result.current.pagination.onPageSizeChange(50));
    act(() => result.current.pagination.onPageChange(3));

    act(() => result.current.setFilters({ pending: true, tag: ['a', 'b'] }));

    expect(result.current.filters).toEqual({ ...NO_FILTERS, pending: true, tag: ['a', 'b'] });
    expect(result.current.pagination).toMatchObject({ page: 1, pageSize: 50 });
    await waitFor(() =>
      expect(fetchPage).toHaveBeenLastCalledWith(
        { ...NO_FILTERS, pending: true, tag: ['a', 'b'], page: 1, pageSize: 50 },
        expect.any(AbortSignal),
      ),
    );
  });

  it('goes back to the first page when the size changes, keeping the filters', async () => {
    const { result, fetchPage } = renderList({ ...NO_FILTERS, q: 'ana' });
    await waitFor(() => expect(result.current.list.status).toBe('ready'));
    act(() => result.current.pagination.onPageChange(3));

    act(() => result.current.pagination.onPageSizeChange(10));

    expect(result.current.pagination).toMatchObject({ page: 1, pageSize: 10 });
    await waitFor(() =>
      expect(fetchPage).toHaveBeenLastCalledWith(
        { ...NO_FILTERS, q: 'ana', page: 1, pageSize: 10 },
        expect.any(AbortSignal),
      ),
    );
  });

  it('keeps the total while another page of the same filters loads, and forgets it when they change', async () => {
    const fetchPage = vi.fn<FetchPage>(() => Promise.resolve(pageOf(87)));
    const { result } = renderList(NO_FILTERS, fetchPage);
    await waitFor(() => expect(result.current.pagination.totalCount).toBe(87));

    fetchPage.mockImplementation(() => new Promise(() => {}));
    act(() => result.current.pagination.onPageChange(2));

    expect(result.current.list.status).toBe('loading');
    expect(result.current.pagination.totalCount).toBe(87);

    act(() => result.current.setFilters({ q: 'ana' }));

    expect(result.current.pagination.totalCount).toBeNull();
  });

  it('moves to the last page that exists when the total shrinks under the page it is on', async () => {
    const fetchPage = vi.fn<FetchPage>();
    fetchPage
      .mockResolvedValueOnce(pageOf(87))
      .mockResolvedValueOnce(pageOf(25, []))
      .mockResolvedValueOnce(pageOf(25));
    const { result } = renderList(NO_FILTERS, fetchPage);
    await waitFor(() => expect(result.current.list.status).toBe('ready'));

    act(() => result.current.pagination.onPageChange(5));

    await waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(3));
    expect(fetchPage.mock.calls.map(([query]) => query.page)).toEqual([1, 5, 2]);
    expect(result.current.pagination.page).toBe(2);
    await waitFor(() => expect(result.current.list.items).toEqual([{ id: '1' }]));
    expect(result.current.pagination.totalCount).toBe(25);
  });

  it('asks again for the same page from a failure', async () => {
    const fetchPage = vi.fn<FetchPage>(() =>
      Promise.resolve({ ok: false, error: NETWORK_PROBLEM }),
    );
    const { result } = renderList({ ...NO_FILTERS, q: 'ana' }, fetchPage);
    await waitFor(() => expect(result.current.list.status).toBe('error'));

    fetchPage.mockResolvedValue(pageOf(87));
    act(() => result.current.list.failure?.onRetry?.());

    expect(result.current.list.status).toBe('loading');
    await waitFor(() => expect(result.current.list.status).toBe('ready'));
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage.mock.calls[1]?.[0]).toEqual(fetchPage.mock.calls[0]?.[0]);
  });
});
