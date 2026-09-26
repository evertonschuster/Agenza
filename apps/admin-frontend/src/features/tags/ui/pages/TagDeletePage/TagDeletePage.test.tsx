import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { TagListPage } from '../TagListPage/TagListPage';
import { TagDeletePage } from './TagDeletePage';
import type { Tag } from '../../../model/tag';

const { mockList, mockDelete } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock('../../../api/tagsRepository', () => ({
  tagsRepository: { list: mockList, delete: mockDelete },
}));

const TAGS: Tag[] = [
  { id: '1', name: 'Promoção', color: '#f59e0b', description: 'Desconto temporário' },
  { id: '2', name: 'VIP', color: '#8b5cf6', description: null },
];

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`location: ${location.pathname}${location.search}`}</div>;
}

function renderAt(initialEntries: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="tags" element={<TagListPage />}>
          <Route path=":id/delete" element={<TagDeletePage />} />
        </Route>
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe('TagDeletePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ ok: true, data: TAGS });
  });

  it('opens the confirmation dialog for the tag clicked in the list, naming it', async () => {
    const user = userEvent.setup();
    renderAt(['/tags']);
    await screen.findByText('Promoção');

    await user.click(screen.getByRole('link', { name: 'Excluir Promoção' }));

    expect(screen.getByRole('heading', { name: 'Excluir etiqueta?' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Tem certeza que deseja excluir a etiqueta "Promoção"? Essa ação não pode ser desfeita.',
      ),
    ).toBeInTheDocument();
  });

  it('deletes the tag, reloads the list from the backend and returns to /tags on confirm (spec US4)', async () => {
    const user = userEvent.setup();
    mockDelete.mockResolvedValue({ ok: true, data: undefined });
    renderAt(['/tags']);
    await screen.findByText('Promoção');

    await user.click(screen.getByRole('link', { name: 'Excluir Promoção' }));
    mockList.mockResolvedValue({ ok: true, data: TAGS.filter((tag) => tag.id !== '1') });
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(mockDelete).toHaveBeenCalledWith('1');
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText('Promoção')).not.toBeInTheDocument());
    expect(screen.getByTestId('location').textContent).toBe('location: /tags');
    expect(screen.queryByRole('heading', { name: 'Excluir etiqueta?' })).not.toBeInTheDocument();
  });

  it('shows the backend error verbatim and keeps the tag when delete is blocked (spec FR-012, US4 scenario 2)', async () => {
    const user = userEvent.setup();
    mockDelete.mockResolvedValue({
      ok: false,
      error: { status: 409, code: 'Tag.InUse', title: 'Esta etiqueta está em uso por 3 serviços.' },
    });
    renderAt(['/tags']);
    await screen.findByText('Promoção');

    await user.click(screen.getByRole('link', { name: 'Excluir Promoção' }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(
      await screen.findByText('Esta etiqueta está em uso por 3 serviços.'),
    ).toBeInTheDocument();
    expect(mockList).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Promoção')).toBeInTheDocument();
  });

  it('closes without deleting when Cancelar is clicked, preserving the active search (spec US4 scenario 3)', async () => {
    const user = userEvent.setup();
    renderAt(['/tags?q=promo']);
    await screen.findByText('Promoção');

    await user.click(screen.getByRole('link', { name: 'Excluir Promoção' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(mockDelete).not.toHaveBeenCalled();
    expect(screen.getByTestId('location')).toHaveTextContent('location: /tags?q=promo');
  });

  it('shows a toast and returns to the list when there is no navigation state (deep link, refresh, or shared URL)', async () => {
    const toastModule = await import('@/shared/ui/toast');
    const toastAddSpy = vi.spyOn(toastModule.toast, 'add');
    renderAt(['/tags/missing-id/delete']);

    await waitFor(() =>
      expect(toastAddSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Etiqueta não encontrada',
          description:
            'Ela pode ter sido excluída por outra pessoa, ou não corresponde à busca ativa.',
        }),
      ),
    );
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('location: /tags'));
  });

  describe('keyboard (spec FR-019)', () => {
    it('keeps deleting deliberate: the confirmation opens on Cancelar, so a following Enter cancels', async () => {
      const user = userEvent.setup();
      renderAt(['/tags']);
      await screen.findByText('Promoção');

      screen.getByRole('link', { name: 'Excluir Promoção' }).focus();
      await user.keyboard('{Enter}');
      await screen.findByRole('heading', { name: 'Excluir etiqueta?' });
      await waitFor(() => expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus());
      await user.keyboard('{Enter}');

      await waitFor(() =>
        expect(screen.getByTestId('location').textContent).toBe('location: /tags'),
      );
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it('deletes with Ctrl+Delete from the confirmation, which a plain Delete never does', async () => {
      const user = userEvent.setup();
      mockDelete.mockResolvedValue({ ok: true, data: undefined });
      renderAt(['/tags']);
      await screen.findByText('VIP');

      screen.getByRole('link', { name: 'Excluir VIP' }).focus();
      await user.keyboard('{Enter}');
      await screen.findByRole('heading', { name: 'Excluir etiqueta?' });
      await user.keyboard('{Delete}');
      expect(mockDelete).not.toHaveBeenCalled();

      await user.keyboard('{Control>}{Delete}{/Control}');

      await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('2'));
      await waitFor(() =>
        expect(screen.getByTestId('location').textContent).toBe('location: /tags'),
      );
    });
  });
});
