import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { pending } from '@/test/pending';
import { TagListPage } from './TagListPage';
import type { Tag } from '../../../model/tag';
import { tagDeleted, tagSaved } from '../../../model/tagEvents';

const { mockList } = vi.hoisted(() => ({ mockList: vi.fn() }));

vi.mock('../../../api/tagsRepository', () => ({
  tagsRepository: { list: mockList },
}));

const SEARCH_LABEL = 'Buscar etiquetas por nome';

const TAGS: Tag[] = [
  { id: '1', name: 'Promoção', color: '#f59e0b', description: 'Desconto temporário' },
  { id: '2', name: 'VIP', color: '#8b5cf6', description: null },
];

interface ListAnswer {
  ok: true;
  data: Tag[];
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`location: ${location.pathname}${location.search}`}</div>;
}

function tagListPageAt(initialEntries: string[] = ['/tags']) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <TagListPage />
      <LocationProbe />
    </MemoryRouter>
  );
}

function renderTagListPage(initialEntries?: string[]) {
  return render(tagListPageAt(initialEntries));
}

function renderPage(tags: Tag[], initialEntries?: string[]) {
  mockList.mockImplementation((search?: string) => {
    const needle = search?.toLowerCase();
    const filtered = needle ? tags.filter((tag) => tag.name.toLowerCase().includes(needle)) : tags;
    return Promise.resolve({ ok: true, data: filtered });
  });
  return renderTagListPage(initialEntries);
}

// Only the row-link tests need a real `tags` Route match — relative link resolution needs it to
// know `/tags` is the route's own base, which a bare, routeless `<TagListPage />` render can't give
// it. Every other test above renders the page directly and never inspects an href.
function renderAtTagsRoute(tags: Tag[]) {
  mockList.mockResolvedValue({ ok: true, data: tags });
  return render(
    <MemoryRouter initialEntries={['/tags']}>
      <Routes>
        <Route path="tags" element={<TagListPage />} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
}

function signalOf(call: number) {
  const [, signal] = (mockList.mock.calls[call] ?? []) as [string | undefined, AbortSignal?];
  return signal;
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
    it('asks once on mount, for every tag', async () => {
      renderPage(TAGS);

      expect(await screen.findByText('Promoção')).toBeInTheDocument();
      expect(mockList).toHaveBeenCalledTimes(1);
      expect(mockList).toHaveBeenCalledWith(undefined, expect.any(AbortSignal));
    });

    it('asks twice on mount only under StrictMode, aborting the first of the two development runs', async () => {
      mockList.mockResolvedValue({ ok: true, data: TAGS });

      render(<StrictMode>{tagListPageAt()}</StrictMode>);

      expect(await screen.findByText('Promoção')).toBeInTheDocument();
      expect(mockList).toHaveBeenCalledTimes(2);
      expect(signalOf(0)?.aborted).toBe(true);
      expect(signalOf(1)?.aborted).toBe(false);
    });

    it('does not ask again when the page renders again', async () => {
      mockList.mockResolvedValue({ ok: true, data: TAGS });
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
        expect(mockList).toHaveBeenLastCalledWith('zzz', expect.any(AbortSignal));
      });

      const clear = await screen.findByRole('button', { name: 'Limpar busca' });
      act(() => {
        fireEvent.click(clear);
        expect(mockList).toHaveBeenCalledTimes(3);
        expect(mockList).toHaveBeenLastCalledWith(undefined, expect.any(AbortSignal));
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
        expect(mockList).toHaveBeenLastCalledWith('vip', expect.any(AbortSignal));
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
        const reload = pending<ListAnswer>();
        mockList.mockImplementationOnce(() => reload.promise);

        act(() => {
          topic.publish({ id: '2' });
          expect(mockList).toHaveBeenCalledTimes(3);
          expect(mockList).toHaveBeenLastCalledWith('vip', expect.any(AbortSignal));
        });

        expect(screen.getByText('VIP')).toBeInTheDocument();
        expect(container.querySelector('[aria-busy="true"]')).toBeNull();

        await act(async () => {
          reload.resolve({ ok: true, data: [{ ...TAGS[1]!, name: 'VIP Ouro' }] });
          await reload.promise;
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
    let resolveInitial!: (value: { ok: true; data: Tag[] }) => void;
    mockList.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveInitial = resolve;
        }),
    );

    const { container } = renderTagListPage();

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByText('Não foi possível carregar as etiquetas.')).not.toBeInTheDocument();

    resolveInitial({ ok: true, data: TAGS });

    await waitFor(() => expect(screen.getByText('Promoção')).toBeInTheDocument());
    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it('renders the title with no route indicator or subtitle (spec FR-015)', async () => {
    renderPage(TAGS);

    expect(await screen.findByRole('heading', { name: 'Etiquetas' })).toBeInTheDocument();
    expect(screen.queryByText('/tags')).not.toBeInTheDocument();
  });

  it('lists every tag with its name, color chip and description (spec US1)', async () => {
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

    await waitFor(() =>
      expect(screen.getByTestId('location').textContent).toBe('location: /tags/new'),
    );
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
    expect(screen.queryByText('Nenhum item encontrado.')).not.toBeInTheDocument();
  });

  it('retries the same search from the failure, showing the skeleton while it reloads', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValueOnce({ ok: true, data: TAGS });
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
    expect(mockList).toHaveBeenLastCalledWith('vip', expect.any(AbortSignal));

    retry.resolve({ ok: true, data: [TAGS[1]!] });

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
      expect(screen.getByTestId('location').textContent).toBe('location: /tags');
    },
  );

  it('does not filter while typing — search only runs once submitted (backend-driven, not frontend)', async () => {
    const user = userEvent.setup();
    renderPage(TAGS);
    await screen.findByText('Promoção');

    await user.type(screen.getByLabelText(SEARCH_LABEL), 'vip');

    expect(mockList).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Promoção')).toBeInTheDocument();
    expect(screen.getByText('VIP')).toBeInTheDocument();
  });

  it('narrows the list to tags whose name contains the search term after pressing Enter (spec US1)', async () => {
    const user = userEvent.setup();
    renderPage(TAGS);
    await screen.findByText('Promoção');

    await user.type(screen.getByLabelText(SEARCH_LABEL), 'vip{Enter}');

    await waitFor(() => expect(screen.queryByText('Promoção')).not.toBeInTheDocument());
    expect(screen.getByText('VIP')).toBeInTheDocument();
  });

  it('leaves the address alone when it searches (ADR 0074)', async () => {
    const user = userEvent.setup();
    renderPage(TAGS);
    await screen.findByText('Promoção');

    await user.type(screen.getByLabelText(SEARCH_LABEL), 'vip{Enter}');

    await waitFor(() => expect(screen.queryByText('Promoção')).not.toBeInTheDocument());
    expect(mockList).toHaveBeenLastCalledWith('vip', expect.any(AbortSignal));
    expect(screen.getByTestId('location').textContent).toBe('location: /tags');
  });

  it('starts with every tag and an empty field whatever the address carries (ADR 0074)', async () => {
    renderPage(TAGS, ['/tags?q=vip']);

    expect(screen.getByLabelText(SEARCH_LABEL)).toHaveValue('');
    expect(await screen.findByText('Promoção')).toBeInTheDocument();
    expect(mockList).toHaveBeenCalledTimes(1);
    expect(mockList).toHaveBeenCalledWith(undefined, expect.any(AbortSignal));
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
    expect(mockList).toHaveBeenLastCalledWith(undefined, expect.any(AbortSignal));
  });

  it('shows the table loading skeleton while a search re-fetch is in flight, replacing the stale rows', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValueOnce({ ok: true, data: TAGS });
    const { container } = renderTagListPage();
    await screen.findByText('Promoção');

    let resolveSearch!: (value: { ok: true; data: Tag[] }) => void;
    mockList.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSearch = resolve;
        }),
    );

    await user.type(screen.getByLabelText(SEARCH_LABEL), 'vip{Enter}');

    await waitFor(() => expect(container.querySelector('[aria-busy="true"]')).not.toBeNull());
    expect(screen.queryByText('Promoção')).not.toBeInTheDocument();
    expect(screen.queryByText('VIP')).not.toBeInTheDocument();

    resolveSearch({ ok: true, data: TAGS.filter((tag) => tag.name === 'VIP') });

    await waitFor(() => expect(screen.getByText('VIP')).toBeInTheDocument());
    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it('keeps the newer search result even if the older, superseded request resolves later (AbortController guard)', async () => {
    const user = userEvent.setup();
    renderPage(TAGS);
    await screen.findByText('Promoção');

    let resolveFirst!: (value: { ok: true; data: Tag[] }) => void;
    mockList.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    );
    const searchInput = screen.getByLabelText(SEARCH_LABEL);
    await user.type(searchInput, 'vip{Enter}');
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));

    let resolveSecond!: (value: { ok: true; data: Tag[] }) => void;
    mockList.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSecond = resolve;
        }),
    );
    await user.clear(searchInput);
    await user.type(searchInput, 'promo{Enter}');
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(3));

    // Resolve the newer (second) search first.
    await act(async () => {
      resolveSecond({ ok: true, data: TAGS.filter((tag) => tag.name === 'Promoção') });
      await Promise.resolve();
    });
    expect(screen.getByText('Promoção')).toBeInTheDocument();
    expect(screen.queryByText('VIP')).not.toBeInTheDocument();

    // The stale (first) request now resolves late — it must not clobber the newer result.
    await act(async () => {
      resolveFirst({ ok: true, data: TAGS.filter((tag) => tag.name === 'VIP') });
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

  it('narrows the list to tags whose name contains the search term after clicking the search button, case-insensitively (spec US1)', async () => {
    const user = userEvent.setup();
    renderPage(TAGS);
    await screen.findByText('Promoção');

    await user.type(screen.getByLabelText(SEARCH_LABEL), 'vip');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    await waitFor(() => expect(screen.queryByText('Promoção')).not.toBeInTheDocument());
    expect(screen.getByText('VIP')).toBeInTheDocument();
  });

  it('says there are no tags yet, without a search action, when the catalog is empty (spec US1)', async () => {
    renderPage([]);

    expect(await screen.findByText('Nenhuma etiqueta ainda')).toBeInTheDocument();
    expect(screen.getByText('Use o botão Nova etiqueta para cadastrar a primeira.')).toBeVisible();
    expect(screen.queryByText('Nenhum item encontrado.')).not.toBeInTheDocument();
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
    expect(mockList).toHaveBeenLastCalledWith(undefined, expect.any(AbortSignal));
  });
});
