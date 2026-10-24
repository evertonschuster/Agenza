import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router';
import { routerAt } from '@/test/renderRoutes';
import { footerSkeleton } from '@/test/footerSkeleton';
import { pending } from '@/test/pending';
import { TagListPage } from './TagListPage';
import type { Tag } from '../../../model/tag';
import { tagDeleted, tagSaved } from '../../../model/tagEvents';
import type { TagList } from '../../../model/tagList';
import type { TagListQuery } from '../../../model/tagListFilters';

const { mockList } = vi.hoisted(() => ({ mockList: vi.fn() }));

vi.mock('../../../api/tagsRepository', () => ({
  tagsRepository: { list: mockList },
}));

const SEARCH_LABEL = 'Buscar etiquetas por nome';
const PAGE_SIZE_LABEL = 'Itens por página';

const PROMO: Tag = {
  id: '1',
  name: 'Promoção',
  color: '#f59e0b',
  description: 'Desconto temporário',
};
const VIP: Tag = { id: '2', name: 'VIP', color: '#8b5cf6', description: null };

const TAGS = [PROMO, VIP];

const FIRST_PAGE_OF_EVERY_TAG = { search: '', page: 1, pageSize: 20 };

type ListAnswer = { ok: true; data: TagList };

function listOf(items: Tag[], paging: Partial<TagList> = {}): ListAnswer {
  return {
    ok: true,
    data: { items, totalCount: items.length, page: 1, pageSize: 20, ...paging },
  };
}

function manyTags(count: number): Tag[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `t${index + 1}`,
    name: `Etiqueta ${String(index + 1).padStart(3, '0')}`,
    color: '#0d9488',
    description: null,
  }));
}

function serve(catalog: Tag[]) {
  mockList.mockImplementation(({ search, page, pageSize }: TagListQuery) => {
    const needle = search.toLowerCase();
    const matching = needle
      ? catalog.filter((tag) => tag.name.toLowerCase().includes(needle))
      : catalog;
    const start = (page - 1) * pageSize;
    return Promise.resolve(
      listOf(matching.slice(start, start + pageSize), {
        totalCount: matching.length,
        page,
        pageSize,
      }),
    );
  });
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`location: ${location.pathname}${location.search}`}</div>;
}

function tagListPageAt(initialEntries: string[] = ['/tags']) {
  return routerAt(
    [
      {
        path: 'tags',
        handle: { crumb: 'Etiquetas' },
        element: (
          <>
            <TagListPage />
            <LocationProbe />
          </>
        ),
        children: [{ path: 'new' }],
      },
    ],
    initialEntries,
  );
}

function renderTagListPage(initialEntries?: string[]) {
  return render(tagListPageAt(initialEntries));
}

function renderPage(catalog: Tag[], initialEntries?: string[]) {
  serve(catalog);
  return renderTagListPage(initialEntries);
}

function renderAtTagsRoute(catalog: Tag[]) {
  return renderPage(catalog);
}

function location() {
  return screen.getByTestId('location').textContent;
}

function signalOf(call: number) {
  const [, signal] = (mockList.mock.calls[call] ?? []) as [TagListQuery, AbortSignal?];
  return signal;
}

function skeletonRows(container: HTMLElement) {
  return container.querySelector('[aria-busy="true"]')?.querySelectorAll('tbody tr');
}

function submitSearch(term: string) {
  fireEvent.change(screen.getByLabelText(SEARCH_LABEL), { target: { value: term } });
  fireEvent.submit(screen.getByRole('search'));
}

describe('TagListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when it asks the backend (ADR 0074)', () => {
    it('asks once on mount, for the first page of 20 tags with no search', async () => {
      renderPage(TAGS);

      expect(await screen.findByText('Promoção')).toBeInTheDocument();
      expect(mockList).toHaveBeenCalledTimes(1);
      expect(mockList).toHaveBeenCalledWith(FIRST_PAGE_OF_EVERY_TAG, expect.any(AbortSignal));
    });

    it('asks twice on mount only under StrictMode, aborting the first of the two development runs', async () => {
      serve(TAGS);

      render(<StrictMode>{tagListPageAt()}</StrictMode>);

      expect(await screen.findByText('Promoção')).toBeInTheDocument();
      expect(mockList).toHaveBeenCalledTimes(2);
      expect(signalOf(0)?.aborted).toBe(true);
      expect(signalOf(1)?.aborted).toBe(false);
    });

    it('does not ask again when the page renders again', async () => {
      serve(TAGS);
      const { rerender } = renderTagListPage();
      await screen.findByText('Promoção');

      rerender(tagListPageAt());
      rerender(tagListPageAt());

      expect(mockList).toHaveBeenCalledTimes(1);
    });

    it('asks exactly once for a search and for "Limpar busca", at the moment of the action', async () => {
      renderPage(TAGS);
      await screen.findByText('Promoção');

      act(() => {
        submitSearch('zzz');
        expect(mockList).toHaveBeenCalledTimes(2);
        expect(mockList).toHaveBeenLastCalledWith(
          { search: 'zzz', page: 1, pageSize: 20 },
          expect.any(AbortSignal),
        );
      });

      const clear = await screen.findByRole('button', { name: 'Limpar busca' });
      act(() => {
        fireEvent.click(clear);
        expect(mockList).toHaveBeenCalledTimes(3);
        expect(mockList).toHaveBeenLastCalledWith(FIRST_PAGE_OF_EVERY_TAG, expect.any(AbortSignal));
      });

      expect(await screen.findByText('Promoção')).toBeInTheDocument();
      expect(mockList).toHaveBeenCalledTimes(3);
    });

    it('asks exactly once for "Tentar novamente", for the same search, at the moment of the click', async () => {
      renderPage(TAGS);
      await screen.findByText('Promoção');
      mockList.mockResolvedValueOnce({
        ok: false,
        error: { title: 'Sem conexão com o servidor. Tente novamente.' },
      });
      act(() => submitSearch('vip'));

      const retry = await screen.findByRole('button', { name: 'Tentar novamente' });
      act(() => {
        fireEvent.click(retry);
        expect(mockList).toHaveBeenCalledTimes(3);
        expect(mockList).toHaveBeenLastCalledWith(
          { search: 'vip', page: 1, pageSize: 20 },
          expect.any(AbortSignal),
        );
      });

      expect(await screen.findByText('VIP')).toBeInTheDocument();
      expect(mockList).toHaveBeenCalledTimes(3);
    });

    it.each([
      ['a tag is saved', tagSaved],
      ['a tag is deleted', tagDeleted],
    ] as const)(
      'asks exactly once for the current search when %s, keeping the rows on screen until the answer',
      async (_event, topic) => {
        const { container } = renderPage(TAGS);
        await screen.findByText('Promoção');
        act(() => submitSearch('vip'));
        await waitFor(() => expect(screen.queryByText('Promoção')).not.toBeInTheDocument());
        const refetched = pending<ListAnswer>();
        mockList.mockImplementationOnce(() => refetched.promise);

        act(() => {
          topic.publish({ id: '2' });
          expect(mockList).toHaveBeenCalledTimes(3);
          expect(mockList).toHaveBeenLastCalledWith(
            { search: 'vip', page: 1, pageSize: 20 },
            expect.any(AbortSignal),
          );
        });

        expect(screen.getByText('VIP')).toBeInTheDocument();
        expect(container.querySelector('[aria-busy="true"]')).toBeNull();
        expect(screen.getByRole('status')).toHaveTextContent('Exibindo 1 de 1 etiqueta');

        await act(async () => {
          refetched.resolve(listOf([{ ...VIP, name: 'VIP Ouro' }]));
          await refetched.promise;
        });

        expect(screen.getByText('VIP Ouro')).toBeInTheDocument();
        expect(mockList).toHaveBeenCalledTimes(3);
      },
    );

    it('aborts the request in flight when another action starts', () => {
      mockList.mockImplementation(() => new Promise<ListAnswer>(() => {}));
      renderTagListPage();

      act(() => submitSearch('vip'));

      expect(signalOf(0)?.aborted).toBe(true);
      expect(signalOf(1)?.aborted).toBe(false);

      act(() => tagSaved.publish({ id: '2' }));

      expect(signalOf(1)?.aborted).toBe(true);
      expect(signalOf(2)?.aborted).toBe(false);
    });

    it('aborts the request in flight when the page unmounts', () => {
      mockList.mockImplementation(() => new Promise<ListAnswer>(() => {}));
      const { unmount } = renderTagListPage();

      unmount();

      expect(signalOf(0)?.aborted).toBe(true);
    });
  });

  it('shows the table loading skeleton on first render, before the initial fetch resolves', async () => {
    const initial = pending<ListAnswer>();
    mockList.mockImplementationOnce(() => initial.promise);

    const { container } = renderTagListPage();

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByText('Não foi possível carregar as etiquetas.')).not.toBeInTheDocument();

    initial.resolve(listOf(TAGS));

    await waitFor(() => expect(screen.getByText('Promoção')).toBeInTheDocument());
    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it('renders the title with no route indicator or subtitle (spec FR-015)', async () => {
    renderPage(TAGS);

    expect(await screen.findByRole('heading', { name: 'Etiquetas' })).toBeInTheDocument();
    expect(screen.queryByText('/tags')).not.toBeInTheDocument();
  });

  it('lists each tag with its name, color chip and description (spec US1)', async () => {
    renderPage(TAGS);

    expect(await screen.findByText('Promoção')).toBeInTheDocument();
    expect(screen.getByText('Desconto temporário')).toBeInTheDocument();
    expect(screen.getByText('VIP')).toBeInTheDocument();
    expect(screen.getByText('Sem descrição')).toBeInTheDocument();
  });

  it('renders a delete link per row, pointing at that tag under /delete (spec US4)', async () => {
    renderAtTagsRoute(TAGS);
    await screen.findByText('Promoção');

    const deleteLink = screen.getByRole('link', { name: 'Excluir Promoção' });
    expect(deleteLink).toHaveAttribute('href', '/tags/1/delete');
    expect(screen.getByRole('link', { name: 'Excluir VIP' })).toHaveAttribute(
      'href',
      '/tags/2/delete',
    );
  });

  it('renders an edit link per row, pointing at that tag under /edit (spec US3)', async () => {
    renderAtTagsRoute(TAGS);
    await screen.findByText('Promoção');

    const editLink = screen.getByRole('link', { name: 'Editar Promoção' });
    expect(editLink).toHaveAttribute('href', '/tags/1/edit');
    expect(screen.getByRole('link', { name: 'Editar VIP' })).toHaveAttribute(
      'href',
      '/tags/2/edit',
    );
  });

  it('renders a "Nova etiqueta" link pointing at /tags/new (spec US2)', async () => {
    renderAtTagsRoute(TAGS);
    await screen.findByText('Promoção');

    const newTag = screen.getByRole('link', { name: 'Nova etiqueta' });
    expect(newTag).toHaveAttribute('href', '/tags/new');
    expect(newTag).toHaveClass('bg-primary');
    expect(newTag.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('clicking Nova etiqueta navigates to /tags/new (spec US2)', async () => {
    const user = userEvent.setup();
    renderAtTagsRoute(TAGS);
    await screen.findByText('Promoção');

    await user.keyboard('n');
    expect(screen.getByTestId('location')).toHaveTextContent('/tags');
    await user.click(screen.getByRole('link', { name: 'Nova etiqueta' }));

    await waitFor(() => expect(location()).toBe('location: /tags/new'));
  });

  it('shows the failure with the backend message and its code, not the empty-catalog message, when the initial fetch fails (spec FR-012)', async () => {
    mockList.mockResolvedValue({
      ok: false,
      error: {
        status: 0,
        code: 'Server.Unavailable',
        title: 'O servidor está instável. Tente novamente em instantes.',
      },
    });

    renderTagListPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Não foi possível carregar as etiquetas.');
    expect(alert).toHaveTextContent('O servidor está instável. Tente novamente em instantes.');
    expect(alert).toHaveTextContent('Código: Server.Unavailable');
    expect(screen.queryByText('Nenhuma etiqueta ainda')).not.toBeInTheDocument();
  });

  it('retries the same search from the failure, showing the skeleton while it reloads', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValueOnce(listOf(TAGS));
    mockList.mockResolvedValueOnce({
      ok: false,
      error: { title: 'Sem conexão com o servidor. Tente novamente.' },
    });
    const retry = pending<ListAnswer>();
    mockList.mockImplementationOnce(() => retry.promise);
    const { container } = renderTagListPage();
    await screen.findByText('Promoção');
    await user.type(screen.getByLabelText(SEARCH_LABEL), 'vip{Enter}');

    await user.click(await screen.findByRole('button', { name: 'Tentar novamente' }));

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(mockList).toHaveBeenLastCalledWith(
      { search: 'vip', page: 1, pageSize: 20 },
      expect.any(AbortSignal),
    );

    retry.resolve(listOf([VIP]));

    expect(await screen.findByText('VIP')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each([['Session.Missing'], ['Authorization.Unauthorized']] as const)(
    "shows the same inline failure for code %s, with no redirect — session handling is not this component's job",
    async (code) => {
      mockList.mockResolvedValue({
        ok: false,
        error: { code, title: 'Sua sessão expirou. Entre novamente.' },
      });

      renderTagListPage();

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Não foi possível carregar as etiquetas.');
      expect(alert).toHaveTextContent('Sua sessão expirou. Entre novamente.');
      expect(location()).toBe('location: /tags');
    },
  );

  it('limits the search field to what the backend accepts', async () => {
    renderPage(TAGS);

    expect(screen.getByLabelText(SEARCH_LABEL)).toHaveAttribute('maxlength', '254');
    await screen.findByText('Promoção');
  });

  it('does not filter while typing — search only runs once submitted (backend-driven, not frontend)', async () => {
    const user = userEvent.setup();
    renderPage(TAGS);
    await screen.findByText('Promoção');

    await user.type(screen.getByLabelText(SEARCH_LABEL), 'vip');

    expect(mockList).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Promoção')).toBeInTheDocument();
    expect(screen.getByText('VIP')).toBeInTheDocument();
  });

  it('narrows the list to tags whose name contains the search term after pressing Enter, leaving the address alone (spec US1, ADR 0074)', async () => {
    const user = userEvent.setup();
    renderPage(TAGS);
    await screen.findByText('Promoção');

    await user.type(screen.getByLabelText(SEARCH_LABEL), 'vip{Enter}');

    await waitFor(() => expect(screen.queryByText('Promoção')).not.toBeInTheDocument());
    expect(screen.getByText('VIP')).toBeInTheDocument();
    expect(mockList).toHaveBeenLastCalledWith(
      { search: 'vip', page: 1, pageSize: 20 },
      expect.any(AbortSignal),
    );
    expect(location()).toBe('location: /tags');
  });

  it('narrows the list from the Buscar button too (spec US1)', async () => {
    const user = userEvent.setup();
    renderPage(TAGS);
    await screen.findByText('Promoção');

    await user.type(screen.getByLabelText(SEARCH_LABEL), 'vip');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    await waitFor(() => expect(screen.queryByText('Promoção')).not.toBeInTheDocument());
    expect(screen.getByText('VIP')).toBeInTheDocument();
  });

  it('starts on the first page of every tag, with an empty field, whatever the address carries (ADR 0074)', async () => {
    renderPage(TAGS, ['/tags?q=vip&page=3&pageSize=10']);

    expect(screen.getByLabelText(SEARCH_LABEL)).toHaveValue('');
    expect(await screen.findByText('Promoção')).toBeInTheDocument();
    expect(mockList).toHaveBeenCalledTimes(1);
    expect(mockList).toHaveBeenCalledWith(FIRST_PAGE_OF_EVERY_TAG, expect.any(AbortSignal));
  });

  it('lists every tag again when the search is submitted blank', async () => {
    const user = userEvent.setup();
    renderPage(TAGS);
    await screen.findByText('Promoção');
    await user.type(screen.getByLabelText(SEARCH_LABEL), 'vip{Enter}');
    await waitFor(() => expect(screen.queryByText('Promoção')).not.toBeInTheDocument());

    await user.clear(screen.getByLabelText(SEARCH_LABEL));
    await user.keyboard('{Enter}');

    expect(await screen.findByText('Promoção')).toBeInTheDocument();
    expect(mockList).toHaveBeenLastCalledWith(FIRST_PAGE_OF_EVERY_TAG, expect.any(AbortSignal));
  });

  it('shows the table loading skeleton while a search is in flight, replacing the stale rows', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValueOnce(listOf(TAGS));
    const { container } = renderTagListPage();
    await screen.findByText('Promoção');

    const search = pending<ListAnswer>();
    mockList.mockImplementationOnce(() => search.promise);

    await user.type(screen.getByLabelText(SEARCH_LABEL), 'vip{Enter}');

    await waitFor(() => expect(container.querySelector('[aria-busy="true"]')).not.toBeNull());
    expect(screen.queryByText('Promoção')).not.toBeInTheDocument();
    expect(screen.queryByText('VIP')).not.toBeInTheDocument();

    search.resolve(listOf([VIP]));

    await waitFor(() => expect(screen.getByText('VIP')).toBeInTheDocument());
    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it('keeps the newer search result even if the older, superseded request resolves later', async () => {
    const user = userEvent.setup();
    renderPage(TAGS);
    await screen.findByText('Promoção');

    const first = pending<ListAnswer>();
    mockList.mockImplementationOnce(() => first.promise);
    const searchInput = screen.getByLabelText(SEARCH_LABEL);
    await user.type(searchInput, 'vip{Enter}');
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));

    const second = pending<ListAnswer>();
    mockList.mockImplementationOnce(() => second.promise);
    await user.clear(searchInput);
    await user.type(searchInput, 'promo{Enter}');
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(3));

    await act(async () => {
      second.resolve(listOf([PROMO]));
      await Promise.resolve();
    });
    expect(screen.getByText('Promoção')).toBeInTheDocument();
    expect(screen.queryByText('VIP')).not.toBeInTheDocument();

    await act(async () => {
      first.resolve(listOf([VIP]));
      await Promise.resolve();
    });
    expect(screen.getByText('Promoção')).toBeInTheDocument();
    expect(screen.queryByText('VIP')).not.toBeInTheDocument();
  });

  it('keeps keyboard focus on the search field after submitting, so the person can keep typing', async () => {
    const user = userEvent.setup();
    renderPage(TAGS);
    await screen.findByText('Promoção');

    const searchInput = screen.getByLabelText(SEARCH_LABEL);
    await user.type(searchInput, 'vip{Enter}');

    await waitFor(() => expect(screen.queryByText('Promoção')).not.toBeInTheDocument());
    expect(searchInput).toHaveFocus();

    await user.keyboard('!');
    expect(searchInput).toHaveValue('vip!');
  });

  it('says there are no tags yet, without a search action, when the catalog is empty (spec US1)', async () => {
    renderPage([]);

    expect(await screen.findByText('Nenhuma etiqueta ainda')).toBeInTheDocument();
    expect(screen.getByText('Use o botão Nova etiqueta para cadastrar a primeira.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Limpar busca' })).not.toBeInTheDocument();
  });

  it('names the searched term, and offers to clear it, when a submitted search finds nothing (spec US1)', async () => {
    const user = userEvent.setup();
    renderPage(TAGS);
    await screen.findByText('Promoção');

    await user.type(screen.getByLabelText(SEARCH_LABEL), 'zzz{Enter}');

    expect(await screen.findByText('Nenhuma etiqueta encontrada para «zzz»')).toBeInTheDocument();
    expect(screen.queryByText('Nenhuma etiqueta ainda')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Limpar busca' })).toBeInTheDocument();
  });

  it('clears the search and the field, and lists every tag again, from "Limpar busca"', async () => {
    const user = userEvent.setup();
    renderPage(TAGS);
    await screen.findByText('Promoção');
    await user.type(screen.getByLabelText(SEARCH_LABEL), 'zzz{Enter}');

    await user.click(await screen.findByRole('button', { name: 'Limpar busca' }));

    expect(await screen.findByText('Promoção')).toBeInTheDocument();
    expect(screen.getByLabelText(SEARCH_LABEL)).toHaveValue('');
    expect(mockList).toHaveBeenLastCalledWith(FIRST_PAGE_OF_EVERY_TAG, expect.any(AbortSignal));
  });

  describe('"Limpar filtros"', () => {
    it('is offered only once a search is applied, not while the term is only typed', async () => {
      const user = userEvent.setup();
      renderPage(TAGS);
      await screen.findByText('Promoção');
      expect(screen.queryByRole('button', { name: 'Limpar filtros' })).not.toBeInTheDocument();

      await user.type(screen.getByLabelText(SEARCH_LABEL), 'vip');
      expect(screen.queryByRole('button', { name: 'Limpar filtros' })).not.toBeInTheDocument();

      await user.keyboard('{Enter}');
      expect(await screen.findByRole('button', { name: 'Limpar filtros' })).toBeInTheDocument();
    });

    it('empties the field and lists every tag again, keeping the size, as "Limpar busca" does', async () => {
      const user = userEvent.setup();
      renderPage(manyTags(45));
      await screen.findByText('Etiqueta 001');
      await user.click(await screen.findByRole('combobox', { name: PAGE_SIZE_LABEL }));
      await user.click(await screen.findByRole('option', { name: '50' }));
      await user.type(screen.getByLabelText(SEARCH_LABEL), 'etiqueta 00{Enter}');
      await waitFor(() => expect(screen.queryByText('Etiqueta 010')).not.toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));

      expect(mockList).toHaveBeenLastCalledWith(
        { search: '', page: 1, pageSize: 50 },
        expect.any(AbortSignal),
      );
      expect(screen.getByLabelText(SEARCH_LABEL)).toHaveValue('');
      expect(await screen.findByText('Etiqueta 045')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Limpar filtros' })).not.toBeInTheDocument();
    });
  });

  describe('paging', () => {
    it('says which tags are on screen out of how many, below the table', async () => {
      renderPage(manyTags(45));

      const status = await screen.findByRole('status');
      expect(status).toHaveTextContent('Exibindo 1–20 de 45 etiquetas');
      expect(screen.getByText('Etiqueta 020')).toBeInTheDocument();
      expect(screen.queryByText('Etiqueta 021')).not.toBeInTheDocument();
      const table = screen.getByRole('table', { name: 'Etiquetas' });
      expect(table.compareDocumentPosition(status)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('draws the footer as a skeleton, with no controls, before the first answer', async () => {
      const initial = pending<ListAnswer>();
      mockList.mockImplementationOnce(() => initial.promise);
      const { container } = renderTagListPage();

      expect(footerSkeleton(container)).not.toBeNull();
      expect(screen.queryByRole('navigation', { name: 'Paginação' })).not.toBeInTheDocument();

      initial.resolve(listOf(manyTags(45).slice(0, 20), { totalCount: 45 }));

      expect(await screen.findByRole('navigation', { name: 'Paginação' })).toBeInTheDocument();
      expect(footerSkeleton(container)).toBeNull();
    });

    it('shows 20 skeleton rows, the default page size, on the first load', () => {
      mockList.mockImplementationOnce(() => pending<ListAnswer>().promise);

      const { container } = renderTagListPage();

      expect(skeletonRows(container)).toHaveLength(20);
    });

    it('goes to the next page, keeping the search and the size, and leaves the address alone', async () => {
      const user = userEvent.setup();
      renderPage(manyTags(45));
      await screen.findByText('Etiqueta 001');
      await user.type(screen.getByLabelText(SEARCH_LABEL), 'etiqueta{Enter}');
      await user.click(await screen.findByRole('combobox', { name: PAGE_SIZE_LABEL }));
      await user.click(await screen.findByRole('option', { name: '10' }));
      await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(11));

      await user.click(screen.getByRole('button', { name: 'Próxima' }));

      expect(await screen.findByText('Etiqueta 011')).toBeInTheDocument();
      expect(screen.queryByText('Etiqueta 001')).not.toBeInTheDocument();
      expect(mockList).toHaveBeenLastCalledWith(
        { search: 'etiqueta', page: 2, pageSize: 10 },
        expect.any(AbortSignal),
      );
      expect(location()).toBe('location: /tags');
      expect(screen.getByRole('status')).toHaveTextContent('Exibindo 11–20 de 45 etiquetas');
    });

    it('goes back to the first page when the size changes, keeping the search', async () => {
      const user = userEvent.setup();
      renderPage(manyTags(45));
      await screen.findByText('Etiqueta 001');
      await user.type(screen.getByLabelText(SEARCH_LABEL), 'etiqueta{Enter}');
      await user.click(await screen.findByRole('button', { name: 'Ir para a página 3' }));
      await screen.findByText('Etiqueta 041');

      await user.click(await screen.findByRole('combobox', { name: PAGE_SIZE_LABEL }));
      await user.click(await screen.findByRole('option', { name: '50' }));

      expect(await screen.findByText('Etiqueta 045')).toBeInTheDocument();
      expect(mockList).toHaveBeenLastCalledWith(
        { search: 'etiqueta', page: 1, pageSize: 50 },
        expect.any(AbortSignal),
      );
      expect(screen.getByRole('status')).toHaveTextContent('Exibindo 1–45 de 45 etiquetas');
    });

    it('starts over on the first page when a search is submitted, keeping the size', async () => {
      const user = userEvent.setup();
      renderPage(manyTags(45));
      await screen.findByText('Etiqueta 001');
      await user.click(await screen.findByRole('combobox', { name: PAGE_SIZE_LABEL }));
      await user.click(await screen.findByRole('option', { name: '10' }));
      await user.click(await screen.findByRole('button', { name: 'Ir para a página 3' }));
      await screen.findByText('Etiqueta 021');

      await user.type(screen.getByLabelText(SEARCH_LABEL), 'etiqueta 0{Enter}');

      expect(await screen.findByText('Etiqueta 001')).toBeInTheDocument();
      expect(mockList).toHaveBeenLastCalledWith(
        { search: 'etiqueta 0', page: 1, pageSize: 10 },
        expect.any(AbortSignal),
      );
    });

    it('refetches the page on screen, with its size, when a tag is saved', async () => {
      const user = userEvent.setup();
      const catalog = manyTags(45);
      renderPage(catalog);
      await screen.findByText('Etiqueta 001');
      await user.click(await screen.findByRole('combobox', { name: PAGE_SIZE_LABEL }));
      await user.click(await screen.findByRole('option', { name: '10' }));
      await user.click(await screen.findByRole('button', { name: 'Ir para a página 2' }));
      await screen.findByText('Etiqueta 011');

      catalog[10] = { ...catalog[10]!, name: 'Etiqueta 011 editada' };
      act(() => tagSaved.publish({ id: 't11' }));

      expect(await screen.findByText('Etiqueta 011 editada')).toBeInTheDocument();
      expect(mockList).toHaveBeenLastCalledWith(
        { search: '', page: 2, pageSize: 10 },
        expect.any(AbortSignal),
      );
      expect(screen.getByRole('status')).toHaveTextContent('Exibindo 11–20 de 45 etiquetas');
    });

    it('moves to the page before when the only tag on the last page is deleted', async () => {
      const user = userEvent.setup();
      const catalog = manyTags(21);
      renderPage(catalog);
      await screen.findByText('Etiqueta 001');
      await user.click(await screen.findByRole('button', { name: 'Ir para a página 2' }));
      await screen.findByText('Etiqueta 021');

      catalog.pop();
      act(() => tagDeleted.publish({ id: 't21' }));

      expect(await screen.findByText('Etiqueta 001')).toBeInTheDocument();
      expect(mockList).toHaveBeenNthCalledWith(
        3,
        { search: '', page: 2, pageSize: 20 },
        expect.any(AbortSignal),
      );
      expect(mockList).toHaveBeenLastCalledWith(FIRST_PAGE_OF_EVERY_TAG, expect.any(AbortSignal));
      expect(screen.queryByText('Nenhuma etiqueta ainda')).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Exibindo 1–20 de 20 etiquetas');
    });

    it('has no controls when a search finds nothing', async () => {
      const user = userEvent.setup();
      renderPage(manyTags(45));
      await screen.findByText('Etiqueta 001');

      await user.type(screen.getByLabelText(SEARCH_LABEL), 'zzz{Enter}');

      await screen.findByText('Nenhuma etiqueta encontrada para «zzz»');
      expect(screen.queryByRole('navigation', { name: 'Paginação' })).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('has no controls when the list failed to load', async () => {
      mockList.mockResolvedValue({ ok: false, error: { title: 'Sem conexão.' } });
      renderTagListPage();

      await screen.findByRole('alert');
      expect(screen.queryByRole('navigation', { name: 'Paginação' })).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });
});
