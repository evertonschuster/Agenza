import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation, useNavigationType } from 'react-router';
import { NETWORK_PROBLEM, type ApiResult } from '@/shared/api/servicesFacade';
import type { PagedResult, Paging } from '@/shared/pagination/paging';
import { usePaginatedList } from './use-paginated-list';

interface Item {
  id: string;
}

const SITUATIONS = ['open', 'closed'] as const;

interface Filters {
  q: string;
  situation: (typeof SITUATIONS)[number] | null;
  pending: boolean;
  tag: string[];
}

type FetchPage = (
  query: Filters & Paging,
  signal: AbortSignal,
) => Promise<ApiResult<PagedResult<Item>>>;

function readFilters(params: URLSearchParams): Filters {
  const situation = params.get('situation');
  return {
    q: params.get('q') ?? '',
    situation: SITUATIONS.find((option) => option === situation) ?? null,
    pending: params.get('pending') === '1',
    tag: params.getAll('tag'),
  };
}

function pageOf(totalCount: number): ApiResult<PagedResult<Item>> {
  return { ok: true, data: { items: [{ id: '1' }], totalCount, page: 1, pageSize: 20 } };
}

function renderList(url: string, fetchPage = vi.fn<FetchPage>(() => Promise.resolve(pageOf(87)))) {
  const view = renderHook(
    () => ({
      list: usePaginatedList({ readFilters, fetchPage }),
      location: useLocation(),
      navigationType: useNavigationType(),
    }),
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
      ),
    },
  );
  return { ...view, fetchPage };
}

describe('usePaginatedList', () => {
  it('reads the filters with the list’s own function and asks for them with the page and the size', async () => {
    const { result, fetchPage } = renderList(
      '/itens?q=ana&situation=open&pending=1&tag=a&tag=b&page=2&pageSize=50',
    );

    await waitFor(() => expect(result.current.list.list.status).toBe('ready'));
    expect(result.current.list.filters).toEqual({
      q: 'ana',
      situation: 'open',
      pending: true,
      tag: ['a', 'b'],
    });
    expect(fetchPage).toHaveBeenCalledWith(
      { q: 'ana', situation: 'open', pending: true, tag: ['a', 'b'], page: 2, pageSize: 50 },
      expect.any(AbortSignal),
    );
  });

  it('writes a flag and a list into the URL and starts over on the first page, keeping the size', async () => {
    const { result, fetchPage } = renderList('/itens?page=3&pageSize=50');
    await waitFor(() => expect(result.current.list.list.status).toBe('ready'));

    act(() => result.current.list.setFilters({ pending: true, tag: ['a', 'b'] }));

    expect(result.current.location.search).toBe('?pageSize=50&pending=1&tag=a&tag=b');
    await waitFor(() =>
      expect(fetchPage).toHaveBeenLastCalledWith(
        { q: '', situation: null, pending: true, tag: ['a', 'b'], page: 1, pageSize: 50 },
        expect.any(AbortSignal),
      ),
    );
  });

  it('takes a value the list does not know out of the URL, replacing the address', async () => {
    const { result } = renderList('/itens?situation=archived&q=ana');

    await waitFor(() => expect(result.current.location.search).toBe('?q=ana'));
    expect(result.current.navigationType).toBe('REPLACE');
    expect(result.current.list.filters.situation).toBeNull();
  });

  it('keeps the total while another page of the same filters loads, and forgets it when they change', async () => {
    const fetchPage = vi.fn<FetchPage>(() => Promise.resolve(pageOf(87)));
    const { result } = renderList('/itens', fetchPage);
    await waitFor(() => expect(result.current.list.pagination.totalCount).toBe(87));

    fetchPage.mockImplementation(() => new Promise(() => {}));
    act(() => result.current.list.pagination.onPageChange(2));

    expect(result.current.list.list.status).toBe('loading');
    expect(result.current.list.pagination.totalCount).toBe(87);

    act(() => result.current.list.setFilters({ q: 'ana' }));

    expect(result.current.list.pagination.totalCount).toBeNull();
  });

  it('asks again for the same page from a failure', async () => {
    const fetchPage = vi.fn<FetchPage>(() =>
      Promise.resolve({ ok: false, error: NETWORK_PROBLEM }),
    );
    const { result } = renderList('/itens?q=ana&page=2', fetchPage);
    await waitFor(() => expect(result.current.list.list.status).toBe('error'));

    fetchPage.mockResolvedValue(pageOf(87));
    act(() => result.current.list.list.failure?.onRetry?.());

    expect(result.current.list.list.status).toBe('loading');
    await waitFor(() => expect(result.current.list.list.status).toBe('ready'));
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage.mock.calls[1]?.[0]).toEqual(fetchPage.mock.calls[0]?.[0]);
  });
});
