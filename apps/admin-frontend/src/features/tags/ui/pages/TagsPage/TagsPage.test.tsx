import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { shortcutRegistry } from '@/shared/keyboard/shortcuts';
import { toast } from '@/shared/ui/toast';
import { TagsPage } from './TagsPage';
import type { Tag } from '../../../model/tag';

const { mockList } = vi.hoisted(() => ({ mockList: vi.fn() }));

vi.mock('../../../api/tagsRepository', () => ({
  tagsRepository: { list: mockList, create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));

const TAGS: Tag[] = [
  { id: '1', name: 'Promoção', color: '#f59e0b', description: 'Desconto temporário' },
  { id: '2', name: 'VIP', color: '#8b5cf6', description: null },
];

function renderPage(tags: Tag[]) {
  mockList.mockImplementation((search?: string) => {
    const needle = search?.toLowerCase();
    const filtered = needle ? tags.filter((tag) => tag.name.toLowerCase().includes(needle)) : tags;
    return Promise.resolve({ ok: true, data: filtered });
  });
  render(<TagsPage />);
}

describe('TagsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    shortcutRegistry.reset();
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

  it('shows a toast and stops the loading state when the initial fetch fails', async () => {
    mockList.mockResolvedValue({
      ok: false,
      error: { title: 'O servidor está instável. Tente novamente em instantes.' },
    });
    const toastAddSpy = vi.spyOn(toast, 'add');

    render(<TagsPage />);

    await waitFor(() =>
      expect(toastAddSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Não foi possível carregar as etiquetas',
          description: 'O servidor está instável. Tente novamente em instantes.',
          type: 'error',
        }),
      ),
    );
    expect(screen.getByText('Nenhuma etiqueta cadastrada')).toBeInTheDocument();
  });

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

  it('shows a distinct message when the catalog is empty (spec US1)', async () => {
    renderPage([]);

    expect(await screen.findByText('Nenhuma etiqueta cadastrada')).toBeInTheDocument();
  });

  it('shows a distinct message when a submitted search finds nothing, not the empty-catalog message (spec US1)', async () => {
    const user = userEvent.setup();
    renderPage(TAGS);
    await screen.findByText('Promoção');

    await user.type(screen.getByLabelText('Buscar etiquetas por nome'), 'zzz{Enter}');

    await waitFor(() =>
      expect(screen.getByText('Nenhuma etiqueta encontrada')).toBeInTheDocument(),
    );
    expect(screen.queryByText('Nenhuma etiqueta cadastrada')).not.toBeInTheDocument();
  });

  it('opens the create dialog from the primary action (spec US2)', async () => {
    const user = userEvent.setup();
    renderPage(TAGS);
    await screen.findByText('Promoção');

    await user.click(screen.getByRole('button', { name: 'Nova etiqueta' }));

    expect(screen.getByRole('heading', { name: 'Nova etiqueta' })).toBeInTheDocument();
  });

  it('opens the edit dialog pre-filled from a row action (spec US3)', async () => {
    const user = userEvent.setup();
    renderPage(TAGS);
    await screen.findByText('Promoção');

    await user.click(screen.getByRole('button', { name: 'Editar Promoção' }));

    expect(screen.getByRole('heading', { name: 'Editar etiqueta' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveValue('Promoção');
  });

  it('opens the delete confirmation from a row action (spec US4)', async () => {
    const user = userEvent.setup();
    renderPage(TAGS);
    await screen.findByText('Promoção');

    await user.click(screen.getByRole('button', { name: 'Excluir Promoção' }));

    expect(
      screen.getByText(
        'Tem certeza que deseja excluir a etiqueta "Promoção"? Essa ação não pode ser desfeita.',
      ),
    ).toBeInTheDocument();
  });
});
