import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { TagListPage } from './TagListPage';
import { loader } from './route';
import type { Tag } from '../../../model/tag';

const { mockList } = vi.hoisted(() => ({ mockList: vi.fn() }));

vi.mock('../../../api/tagsRepository', () => ({
  tagsRepository: { list: mockList },
}));

const TAGS: Tag[] = [
  { id: '1', name: 'Promoção', color: '#f59e0b', description: 'Desconto temporário' },
  { id: '2', name: 'VIP', color: '#8b5cf6', description: null },
];

function buildRouter() {
  return createMemoryRouter(
    [
      { path: '/login', Component: () => <div>Login Screen</div> },
      { path: '/tags', Component: TagListPage, loader },
    ],
    { initialEntries: ['/tags'] },
  );
}

function renderPage(tags: Tag[]) {
  mockList.mockImplementation((search?: string) => {
    const needle = search?.toLowerCase();
    const filtered = needle ? tags.filter((tag) => tag.name.toLowerCase().includes(needle)) : tags;
    return Promise.resolve({ ok: true, data: filtered });
  });
  render(<RouterProvider router={buildRouter()} />);
}

describe('TagListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    render(<RouterProvider router={buildRouter()} />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Não foi possível carregar.');
    expect(screen.queryByText('Nenhum item encontrado.')).not.toBeInTheDocument();
  });

  it.each([['Session.Missing'], ['Authorization.Unauthorized']] as const)(
    'redirects to /login without rendering an error, for code %s',
    async (code) => {
      mockList.mockResolvedValue({
        ok: false,
        error: { code, title: 'Sua sessão expirou. Entre novamente.' },
      });

      render(<RouterProvider router={buildRouter()} />);

      expect(await screen.findByText('Login Screen')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
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
