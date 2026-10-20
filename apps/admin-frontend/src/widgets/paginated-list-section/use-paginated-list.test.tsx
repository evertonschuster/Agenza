import { describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { NETWORK_PROBLEM, type ApiResult } from '@/shared/api/servicesFacade';
import type { PagedResult, Paging } from '@/shared/pagination/paging';
import { pending } from '@/test/pending';
import type { UsePaginatedListOptions } from './paginated-list-section.types';
import { usePaginatedList } from './use-paginated-list';

interface Item {
  id: string;
}

interface Filters {
  search: string;
  situation: 'open' | 'closed' | null;
  pending: boolean;
  tag: string[];
  minAge: number | null;
}

type Page = ApiResult<PagedResult<Item>>;

type FetchPage = (query: Filters & Paging, signal: AbortSignal) => Promise<Page>;

const NO_FILTERS: Filters = { search: '', situation: null, pending: false, tag: [], minAge: null };

function pageOf(totalCount: number, items: Item[] = [{ id: '1' }]): Page {
  return { ok: true, data: { items, totalCount, page: 1, pageSize: 20 } };
}

function signalOf(fetchPage: ReturnType<typeof vi.fn<FetchPage>>, call: number) {
  return fetchPage.mock.calls[call]?.[1];
}

function renderList(
  initialFilters: Filters = NO_FILTERS,
  fetchPage = vi.fn<FetchPage>(() => Promise.resolve(pageOf(87))),
) {
  const view = renderHook(() => usePaginatedList({ initialFilters, fetchPage }));
  return { ...view, fetchPage };
}

describe('usePaginatedList', () => {
  describe('when it asks the backend (ADR 0071)', () => {
    it('asks once on mount, for the initial filters on the first page at the default size, with no router around it', async () => {
      const initialFilters: Filters = {
        search: 'ana',
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

    it('asks twice on mount only under StrictMode, aborting the first of the two development runs', async () => {
      const fetchPage = vi.fn<FetchPage>(() => Promise.resolve(pageOf(87)));
      function List() {
        const { list } = usePaginatedList({ initialFilters: NO_FILTERS, fetchPage });
        return <p>{list.status}</p>;
      }

      render(
        <StrictMode>
          <List />
        </StrictMode>,
      );

      expect(await screen.findByText('ready')).toBeInTheDocument();
      expect(fetchPage).toHaveBeenCalledTimes(2);
      expect(signalOf(fetchPage, 0)?.aborted).toBe(true);
      expect(signalOf(fetchPage, 1)?.aborted).toBe(false);
    });

    it('does not ask again when it renders again, even with other options', async () => {
      const fetchPage = vi.fn<FetchPage>(() => Promise.resolve(pageOf(87)));
      const otherFetchPage = vi.fn<FetchPage>(() => Promise.resolve(pageOf(1)));
      const { result, rerender } = renderHook(
        (options: UsePaginatedListOptions<Filters, Item>) => usePaginatedList(options),
        { initialProps: { initialFilters: NO_FILTERS, fetchPage } },
      );
      await waitFor(() => expect(result.current.list.status).toBe('ready'));

      rerender({ initialFilters: { ...NO_FILTERS, search: 'outro' }, fetchPage: otherFetchPage });
      rerender({ initialFilters: { ...NO_FILTERS, search: 'outro' }, fetchPage: otherFetchPage });

      expect(fetchPage).toHaveBeenCalledTimes(1);
      expect(otherFetchPage).not.toHaveBeenCalled();
      expect(result.current.filters).toEqual(NO_FILTERS);
    });

    it('asks exactly once for each action, at the moment of the action', async () => {
      const { result, fetchPage } = renderList();
      await waitFor(() => expect(result.current.list.status).toBe('ready'));

      act(() => {
        result.current.applyFilters({ search: 'ana' });
        expect(fetchPage).toHaveBeenCalledTimes(2);
      });

      act(() => {
        result.current.pagination.onPageChange(2);
        expect(fetchPage).toHaveBeenCalledTimes(3);
      });

      act(() => {
        result.current.pagination.onPageSizeChange(50);
        expect(fetchPage).toHaveBeenCalledTimes(4);
      });

      await waitFor(() => expect(result.current.list.status).toBe('ready'));
      expect(fetchPage).toHaveBeenCalledTimes(4);
    });

    it('aborts the request in flight when another action starts, and shows only the latest answer', async () => {
      const second = pending<Page>();
      const fetchPage = vi
        .fn<FetchPage>()
        .mockResolvedValueOnce(pageOf(87))
        .mockImplementationOnce(() => second.promise)
        .mockResolvedValueOnce(pageOf(87, [{ id: 'page-3' }]));
      const { result } = renderList(NO_FILTERS, fetchPage);
      await waitFor(() => expect(result.current.list.status).toBe('ready'));

      act(() => result.current.pagination.onPageChange(2));
      act(() => result.current.pagination.onPageChange(3));

      await waitFor(() => expect(result.current.list.items).toEqual([{ id: 'page-3' }]));
      expect(signalOf(fetchPage, 1)?.aborted).toBe(true);

      await act(async () => {
        second.resolve(pageOf(87, [{ id: 'page-2' }]));
        await second.promise;
      });

      expect(result.current.list.items).toEqual([{ id: 'page-3' }]);
      expect(result.current.pagination.page).toBe(3);
    });

    it('aborts the request in flight when it unmounts', () => {
      const fetchPage = vi.fn<FetchPage>(() => new Promise<Page>(() => {}));
      const { unmount } = renderList(NO_FILTERS, fetchPage);

      unmount();

      expect(signalOf(fetchPage, 0)?.aborted).toBe(true);
    });
  });

  describe('what it asks for', () => {
    it('merges a change of filters into the ones it has and starts over on the first page, keeping the size', async () => {
      const { result, fetchPage } = renderList();
      await waitFor(() => expect(result.current.list.status).toBe('ready'));
      act(() => result.current.pagination.onPageSizeChange(50));
      act(() => result.current.pagination.onPageChange(3));

      act(() => result.current.applyFilters({ pending: true, tag: ['a', 'b'] }));

      expect(result.current.filters).toEqual({ ...NO_FILTERS, pending: true, tag: ['a', 'b'] });
      expect(result.current.pagination).toMatchObject({ page: 1, pageSize: 50 });
      expect(fetchPage).toHaveBeenLastCalledWith(
        { ...NO_FILTERS, pending: true, tag: ['a', 'b'], page: 1, pageSize: 50 },
        expect.any(AbortSignal),
      );
    });

    it('goes back to the first page when the size changes, keeping the filters', async () => {
      const { result, fetchPage } = renderList({ ...NO_FILTERS, search: 'ana' });
      await waitFor(() => expect(result.current.list.status).toBe('ready'));
      act(() => result.current.pagination.onPageChange(3));

      act(() => result.current.pagination.onPageSizeChange(10));

      expect(result.current.pagination).toMatchObject({ page: 1, pageSize: 10 });
      expect(fetchPage).toHaveBeenLastCalledWith(
        { ...NO_FILTERS, search: 'ana', page: 1, pageSize: 10 },
        expect.any(AbortSignal),
      );
    });

    it('keeps the total while another page of the same filters loads, and forgets it when they change', async () => {
      const fetchPage = vi.fn<FetchPage>(() => Promise.resolve(pageOf(87)));
      const { result } = renderList(NO_FILTERS, fetchPage);
      await waitFor(() => expect(result.current.pagination.totalCount).toBe(87));

      fetchPage.mockImplementation(() => new Promise<Page>(() => {}));
      act(() => result.current.pagination.onPageChange(2));

      expect(result.current.list.status).toBe('loading');
      expect(result.current.pagination.totalCount).toBe(87);

      act(() => result.current.applyFilters({ search: 'ana' }));

      expect(result.current.pagination.totalCount).toBeNull();
    });

    it('asks for the last page that exists when the total shrinks under the page it asked for', async () => {
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
      const { result } = renderList({ ...NO_FILTERS, search: 'ana' }, fetchPage);
      await waitFor(() => expect(result.current.list.status).toBe('error'));

      fetchPage.mockResolvedValue(pageOf(87));
      act(() => result.current.list.failure?.onRetry?.());

      expect(result.current.list.status).toBe('loading');
      await waitFor(() => expect(result.current.list.status).toBe('ready'));
      expect(fetchPage).toHaveBeenCalledTimes(2);
      expect(fetchPage.mock.calls[1]?.[0]).toEqual(fetchPage.mock.calls[0]?.[0]);
    });
  });
});
