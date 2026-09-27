import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createMemoryRouter,
  MemoryRouter,
  Route,
  RouterProvider,
  Routes,
  useLocation,
} from 'react-router';
import { TagListPage } from '../TagListPage/TagListPage';
import { TagDeletePage } from './TagDeletePage';
import type { Tag } from '../../../model/tag';

const { mockList, mockGet, mockDelete } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockGet: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock('../../../api/tagsRepository', () => ({
  tagsRepository: { list: mockList, get: mockGet, delete: mockDelete },
}));

const TAGS: Tag[] = [
  { id: '1', name: 'Promoção', color: '#f59e0b', description: 'Desconto temporário' },
  { id: '2', name: 'VIP', color: '#8b5cf6', description: null },
];

const PROMOCAO_CONFIRMATION = 'Tem certeza que deseja excluir a etiqueta "Promoção"?';

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`location: ${location.pathname}${location.search}`}</div>;
}

function routes() {
  return (
    <>
      <Routes>
        <Route path="tags" element={<TagListPage />}>
          <Route path=":id/delete" element={<TagDeletePage />} />
        </Route>
      </Routes>
      <LocationProbe />
    </>
  );
}

function renderAt(initialEntries: string[]) {
  return render(<MemoryRouter initialEntries={initialEntries}>{routes()}</MemoryRouter>);
}

describe('TagDeletePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ ok: true, data: TAGS });
    mockGet.mockImplementation((id: string) => {
      const tag = TAGS.find((candidate) => candidate.id === id);
      return Promise.resolve(
        tag
          ? { ok: true, data: tag }
          : {
              ok: false,
              error: {
                status: 404,
                code: 'Tag.NotFound',
                title: `Etiqueta '${id}' não foi encontrada.`,
              },
            },
      );
    });
  });

  it('opens the confirmation dialog for the tag clicked in the list, naming it', async () => {
    const user = userEvent.setup();
    renderAt(['/tags']);
    await screen.findByText('Promoção');

    await user.click(screen.getByRole('link', { name: 'Excluir Promoção' }));

    expect(screen.getByRole('heading', { name: 'Excluir etiqueta?' })).toBeInTheDocument();
    expect(await screen.findByText(PROMOCAO_CONFIRMATION)).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith('1');
  });

  it('opens from a deep link (refresh, bookmark or shared URL) by fetching the tag', async () => {
    renderAt(['/tags/1/delete']);

    expect(await screen.findByText(PROMOCAO_CONFIRMATION)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeEnabled();
  });

  it('shows the question and the warning on separate lines', async () => {
    renderAt(['/tags/1/delete']);

    expect(await screen.findByText(PROMOCAO_CONFIRMATION)).toBeInTheDocument();
    expect(screen.getByText('Essa ação não pode ser desfeita.')).toBeInTheDocument();
  });

  it('announces the load and keeps Excluir disabled until the tag arrives', async () => {
    const user = userEvent.setup();
    let resolveGet!: (result: { ok: true; data: Tag }) => void;
    mockGet.mockReturnValue(new Promise((resolve) => (resolveGet = resolve)));
    renderAt(['/tags/1/delete']);

    expect(await screen.findByRole('status')).toHaveTextContent('Carregando…');
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeDisabled();
    await user.keyboard('{Control>}{Delete}{/Control}');
    expect(mockDelete).not.toHaveBeenCalled();

    resolveGet({ ok: true, data: TAGS[0]! });

    expect(await screen.findByText(PROMOCAO_CONFIRMATION)).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeEnabled();
  });

  it('deletes the tag, reloads the list from the backend and returns to /tags on confirm (spec US4)', async () => {
    const user = userEvent.setup();
    mockDelete.mockResolvedValue({ ok: true, data: undefined });
    renderAt(['/tags']);
    await screen.findByText('Promoção');

    await user.click(screen.getByRole('link', { name: 'Excluir Promoção' }));
    await screen.findByText(PROMOCAO_CONFIRMATION);
    mockList.mockResolvedValue({ ok: true, data: TAGS.filter((tag) => tag.id !== '1') });
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(mockDelete).toHaveBeenCalledWith('1');
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText('Promoção')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('location: /tags'));
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
    await screen.findByText(PROMOCAO_CONFIRMATION);
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(
      await screen.findByText('Esta etiqueta está em uso por 3 serviços.'),
    ).toBeInTheDocument();
    expect(mockList).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Promoção')).toBeInTheDocument();
  });

  it('goes back to the list after deleting, so the browser Back button does not reopen the confirmation', async () => {
    const user = userEvent.setup();
    mockDelete.mockResolvedValue({ ok: true, data: undefined });
    const router = createMemoryRouter(
      [
        {
          path: '/tags',
          element: (
            <>
              <TagListPage />
              <LocationProbe />
            </>
          ),
          children: [{ path: ':id/delete', element: <TagDeletePage /> }],
        },
      ],
      { initialEntries: ['/tags'] },
    );
    render(<RouterProvider router={router} />);
    await screen.findByText('VIP');

    await user.click(screen.getByRole('link', { name: 'Excluir VIP' }));
    await screen.findByText(/excluir a etiqueta "VIP"/);
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('location: /tags'));

    await act(() => router.navigate(-1));

    expect(screen.getByTestId('location').textContent).toBe('location: /tags');
    expect(screen.queryByRole('heading', { name: 'Excluir etiqueta?' })).not.toBeInTheDocument();
  });

  it('closes without deleting when Cancelar is clicked, preserving the active search (spec US4 scenario 3)', async () => {
    const user = userEvent.setup();
    renderAt(['/tags?q=promo']);
    await screen.findByText('Promoção');

    await user.click(screen.getByRole('link', { name: 'Excluir Promoção' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(mockDelete).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByTestId('location').textContent).toBe('location: /tags?q=promo'),
    );
  });

  it('shows the backend message in a toast and returns to the list when the tag does not exist', async () => {
    const toastModule = await import('@/shared/ui/toast');
    const toastAddSpy = vi.spyOn(toastModule.toast, 'add');
    renderAt(['/tags/missing-id/delete']);

    await waitFor(() =>
      expect(toastAddSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Não foi possível abrir a etiqueta',
          description: "Etiqueta 'missing-id' não foi encontrada.",
        }),
      ),
    );
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('location: /tags'));
    toastAddSpy.mockRestore();
  });

  it('shows that toast only once under StrictMode, whose double-run effect would otherwise repeat it', async () => {
    const toastModule = await import('@/shared/ui/toast');
    const toastAddSpy = vi.spyOn(toastModule.toast, 'add');
    render(
      <StrictMode>
        <MemoryRouter initialEntries={['/tags/missing-id/delete']}>{routes()}</MemoryRouter>
      </StrictMode>,
    );

    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('location: /tags'));
    const notFoundToasts = toastAddSpy.mock.calls.filter(
      ([options]) => options.title === 'Não foi possível abrir a etiqueta',
    );
    expect(notFoundToasts).toHaveLength(1);
    toastAddSpy.mockRestore();
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
      await screen.findByText(/excluir a etiqueta "VIP"/);
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
