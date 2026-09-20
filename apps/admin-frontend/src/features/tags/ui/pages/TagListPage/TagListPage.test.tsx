import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { TagListPage } from './TagListPage';
import type { Tag } from '../../../model/tag';

const { mockList } = vi.hoisted(() => ({ mockList: vi.fn() }));

vi.mock('../../../api/tagsRepository', () => ({
  tagsRepository: { list: mockList },
}));

const TAGS: Tag[] = [
  { id: '1', name: 'Promoção', color: '#f59e0b', description: 'Desconto temporário' },
  { id: '2', name: 'VIP', color: '#8b5cf6', description: null },
];

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`location: ${location.pathname}${location.search}`}</div>;
}

function renderTagListPage(initialEntries: string[] = ['/tags']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <TagListPage />
      <LocationProbe />
    </MemoryRouter>,
  );
}

function renderPage(tags: Tag[], initialEntries?: string[]) {
  mockList.mockImplementation((search?: string) => {
    const needle = search?.toLowerCase();
    const filtered = needle ? tags.filter((tag) => tag.name.toLowerCase().includes(needle)) : tags;
    return Promise.resolve({ ok: true, data: filtered });
  });
  return renderTagListPage(initialEntries);
}

describe('TagListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(screen.queryByText('Não foi possível carregar.')).not.toBeInTheDocument();

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

  it('shows a generic inline failure, not the empty-catalog message, when the initial fetch fails', async () => {
    mockList.mockResolvedValue({
      ok: false,
      error: { title: 'O servidor está instável. Tente novamente em instantes.' },
    });

    renderTagListPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Não foi possível carregar.');
    expect(screen.queryByText('Nenhum item encontrado.')).not.toBeInTheDocument();
  });

  it.each([['Session.Missing'], ['Authorization.Unauthorized']] as const)(
    "shows the same generic inline failure for code %s, with no redirect — session handling is not this component's job",
    async (code) => {
      mockList.mockResolvedValue({
        ok: false,
        error: { code, title: 'Sua sessão expirou. Entre novamente.' },
      });

      renderTagListPage();

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Não foi possível carregar.');
    },
  );

  it('does not filter while typing — search only runs once submitted (backend-driven, not frontend)', async () => {
    const user = userEvent.setup();
    renderPage(TAGS);
    await screen.findByText('Promoção');

    await user.type(screen.getByLabelText('Buscar etiquetas por nome'), 'vip');

    expect(screen.getByText('Promoção')).toBeInTheDocument();
    expect(screen.getByText('VIP')).toBeInTheDocument();
  });

  it('narrows the list to tags whose name contains the search term after pressing Enter (spec US1)', async () => {
    const user = userEvent.setup();
    renderPage(TAGS);
    await screen.findByText('Promoção');

    await user.type(screen.getByLabelText('Buscar etiquetas por nome'), 'vip{Enter}');

    await waitFor(() => expect(screen.queryByText('Promoção')).not.toBeInTheDocument());
    expect(screen.getByText('VIP')).toBeInTheDocument();
  });

  it('adds the submitted search term to the URL as ?q=', async () => {
    const user = userEvent.setup();
    renderPage(TAGS);
    await screen.findByText('Promoção');

    await user.type(screen.getByLabelText('Buscar etiquetas por nome'), 'vip{Enter}');

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/tags?q=vip'));
  });

  it('reads the initial search term from the URL, pre-filling the field and filtering the fetch', async () => {
    renderPage(TAGS, ['/tags?q=vip']);

    expect(screen.getByLabelText('Buscar etiquetas por nome')).toHaveValue('vip');
    await waitFor(() => expect(mockList).toHaveBeenCalledWith('vip'));
    expect(await screen.findByText('VIP')).toBeInTheDocument();
    expect(screen.queryByText('Promoção')).not.toBeInTheDocument();
  });

  it('clears the ?q= param instead of leaving it empty, when the search is submitted blank', async () => {
    const user = userEvent.setup();
    renderPage(TAGS, ['/tags?q=vip']);
    await screen.findByText('VIP');

    await user.clear(screen.getByLabelText('Buscar etiquetas por nome'));
    await user.keyboard('{Enter}');

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/tags'));
    expect(screen.getByTestId('location')).not.toHaveTextContent('?q=');
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

    await user.type(screen.getByLabelText('Buscar etiquetas por nome'), 'vip{Enter}');

    await waitFor(() => expect(container.querySelector('[aria-busy="true"]')).not.toBeNull());
    expect(screen.queryByText('Promoção')).not.toBeInTheDocument();
    expect(screen.queryByText('VIP')).not.toBeInTheDocument();

    resolveSearch({ ok: true, data: TAGS.filter((tag) => tag.name === 'VIP') });

    await waitFor(() => expect(screen.getByText('VIP')).toBeInTheDocument());
    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it('keeps keyboard focus on the search field after submitting, so the person can keep typing', async () => {
    const user = userEvent.setup();
    renderPage(TAGS);
    await screen.findByText('Promoção');

    const searchInput = screen.getByLabelText('Buscar etiquetas por nome');
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

    await user.type(screen.getByLabelText('Buscar etiquetas por nome'), 'vip');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    await waitFor(() => expect(screen.queryByText('Promoção')).not.toBeInTheDocument());
    expect(screen.getByText('VIP')).toBeInTheDocument();
  });

  it('shows a generic empty message when the catalog is empty (spec US1)', async () => {
    renderPage([]);

    expect(await screen.findByText('Nenhum item encontrado.')).toBeInTheDocument();
  });

  it('shows the same generic empty message when a submitted search finds nothing (spec US1)', async () => {
    const user = userEvent.setup();
    renderPage(TAGS);
    await screen.findByText('Promoção');

    await user.type(screen.getByLabelText('Buscar etiquetas por nome'), 'zzz{Enter}');

    await waitFor(() => expect(screen.getByText('Nenhum item encontrado.')).toBeInTheDocument());
  });
});
