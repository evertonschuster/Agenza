import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createMemoryRouter,
  MemoryRouter,
  Outlet,
  Route,
  RouterProvider,
  Routes,
  useLocation,
} from 'react-router';
import { TagListPage } from '../TagListPage/TagListPage';
import { TagFormPage } from './TagFormPage';
import type { TagListQuery } from '../../../api/tagsRepository';
import { TAG_DESCRIPTION_MAX_LENGTH, TAG_NAME_MAX_LENGTH, type Tag } from '../../../model/tag';

const { mockList, mockGet, mockCreate, mockUpdate } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockGet: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock('../../../api/tagsRepository', () => ({
  tagsRepository: { list: mockList, get: mockGet, create: mockCreate, update: mockUpdate },
}));

const TAGS: Tag[] = [
  { id: '1', name: 'Promoção', color: '#f59e0b', description: 'Desconto temporário' },
  { id: '2', name: 'VIP', color: '#8b5cf6', description: null },
];

function listOf(items: Tag[]) {
  return { ok: true, data: { items, totalCount: items.length, page: 1, pageSize: 20 } };
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`location: ${location.pathname}${location.search}`}</div>;
}

function renderAt(initialEntries: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="tags" element={<TagListPage />}>
          <Route path="new" element={<TagFormPage />} />
          <Route path=":id/edit" element={<TagFormPage />} />
        </Route>
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
}

function renderRouterAt(initialEntries: string[]) {
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
        children: [
          { path: 'new', element: <TagFormPage /> },
          { path: ':id/edit', element: <TagFormPage /> },
        ],
      },
    ],
    { initialEntries },
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe('TagFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue(listOf(TAGS));
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

  describe('create mode (/tags/new)', () => {
    it('opens with an empty form titled "Nova etiqueta"', async () => {
      renderAt(['/tags/new']);

      expect(await screen.findByRole('heading', { name: 'Nova etiqueta' })).toBeInTheDocument();
      expect(screen.getByLabelText('Nome')).toHaveValue('');
      expect(screen.getByLabelText('Descrição')).toHaveValue('');
    });

    it('blocks submission and shows inline errors when name and color are missing (spec US2 scenario 2)', async () => {
      const user = userEvent.setup();
      renderAt(['/tags/new']);
      await screen.findByRole('heading', { name: 'Nova etiqueta' });

      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(await screen.findByText('O nome da etiqueta é obrigatório.')).toBeInTheDocument();
      expect(screen.getByText('A cor da etiqueta é obrigatória.')).toBeInTheDocument();
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('creates the tag, refreshes the list and returns to /tags on success (spec US2 scenario 1)', async () => {
      const user = userEvent.setup();
      mockCreate.mockResolvedValue({
        ok: true,
        data: { id: '3', name: 'Sazonal', color: '#0ea5e9', description: null },
      });
      renderAt(['/tags/new']);
      await screen.findByRole('heading', { name: 'Nova etiqueta' });

      await user.type(screen.getByLabelText('Nome'), 'Sazonal');
      await user.click(screen.getByRole('radio', { name: 'Azul' }));
      mockList.mockResolvedValue(
        listOf([...TAGS, { id: '3', name: 'Sazonal', color: '#0ea5e9', description: null }]),
      );
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(mockCreate).toHaveBeenCalledWith({
        name: 'Sazonal',
        color: '#0ea5e9',
        description: null,
      });
      await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
      await waitFor(() =>
        expect(screen.getByTestId('location').textContent).toBe('location: /tags'),
      );
      expect(await screen.findByText('Sazonal')).toBeInTheDocument();
    });

    it('shows saving feedback on the submit button while the request is in flight', async () => {
      const user = userEvent.setup();
      let resolveCreate!: (result: { ok: true; data: Tag }) => void;
      mockCreate.mockReturnValue(new Promise((resolve) => (resolveCreate = resolve)));
      renderAt(['/tags/new']);
      await screen.findByRole('heading', { name: 'Nova etiqueta' });

      await user.type(screen.getByLabelText('Nome'), 'Sazonal');
      await user.click(screen.getByRole('radio', { name: 'Azul' }));
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      const savingButton = await screen.findByRole('button', { name: 'Salvando…' });
      expect(savingButton).toHaveAttribute('aria-disabled', 'true');

      resolveCreate({
        ok: true,
        data: { id: '3', name: 'Sazonal', color: '#0ea5e9', description: null },
      });

      await waitFor(() =>
        expect(screen.getByTestId('location').textContent).toBe('location: /tags'),
      );
    });

    it('offers no way out while saving — Cancelar disabled, ✕ hidden, Esc ignored — because the save finishes anyway (spec FR-018)', async () => {
      const user = userEvent.setup();
      let resolveCreate!: (result: { ok: true; data: Tag }) => void;
      mockCreate.mockReturnValue(new Promise((resolve) => (resolveCreate = resolve)));
      renderAt(['/tags/new']);
      await screen.findByRole('heading', { name: 'Nova etiqueta' });

      await user.type(screen.getByLabelText('Nome'), 'Sazonal');
      await user.click(screen.getByRole('radio', { name: 'Azul' }));
      await user.click(screen.getByRole('button', { name: 'Salvar' }));
      await screen.findByRole('button', { name: 'Salvando…' });

      expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
      expect(screen.queryByRole('button', { name: 'Fechar' })).not.toBeInTheDocument();
      await user.keyboard('{Escape}');
      expect(screen.getByTestId('location').textContent).toBe('location: /tags/new');

      resolveCreate({
        ok: true,
        data: { id: '3', name: 'Sazonal', color: '#0ea5e9', description: null },
      });
      await waitFor(() =>
        expect(screen.getByTestId('location').textContent).toBe('location: /tags'),
      );
    });

    it('hands the way out back once a save fails, so the person is never stuck', async () => {
      const user = userEvent.setup();
      mockCreate.mockResolvedValue({
        ok: false,
        error: { status: 0, code: 'Network.Unreachable', title: 'Sem conexão com o servidor.' },
      });
      renderAt(['/tags/new']);
      await screen.findByRole('heading', { name: 'Nova etiqueta' });

      await user.type(screen.getByLabelText('Nome'), 'Sazonal');
      await user.click(screen.getByRole('radio', { name: 'Azul' }));
      await user.click(screen.getByRole('button', { name: 'Salvar' }));
      await screen.findByRole('alert');

      expect(screen.getByRole('button', { name: 'Cancelar' })).toBeEnabled();
      await user.click(screen.getByRole('button', { name: 'Cancelar' }));
      await waitFor(() =>
        expect(screen.getByTestId('location').textContent).toBe('location: /tags'),
      );
    });

    it('normalizes a whitespace-only description to null', async () => {
      const user = userEvent.setup();
      mockCreate.mockResolvedValue({
        ok: true,
        data: { id: '3', name: 'Sazonal', color: '#0ea5e9', description: null },
      });
      renderAt(['/tags/new']);
      await screen.findByRole('heading', { name: 'Nova etiqueta' });

      await user.type(screen.getByLabelText('Nome'), 'Sazonal');
      await user.type(screen.getByLabelText('Descrição'), '   ');
      await user.click(screen.getByRole('radio', { name: 'Azul' }));
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      await waitFor(() =>
        expect(mockCreate).toHaveBeenCalledWith({
          name: 'Sazonal',
          color: '#0ea5e9',
          description: null,
        }),
      );
    });

    it(`caps typing at ${TAG_NAME_MAX_LENGTH} characters for the name and ${TAG_DESCRIPTION_MAX_LENGTH} for the description (spec FR-005)`, async () => {
      const user = userEvent.setup();
      renderAt(['/tags/new']);
      await screen.findByRole('heading', { name: 'Nova etiqueta' });

      await user.click(screen.getByLabelText('Nome'));
      await user.paste('a'.repeat(TAG_NAME_MAX_LENGTH + 1));
      await user.click(screen.getByLabelText('Descrição'));
      await user.paste('b'.repeat(TAG_DESCRIPTION_MAX_LENGTH + 1));

      expect(screen.getByLabelText('Nome')).toHaveValue('a'.repeat(TAG_NAME_MAX_LENGTH));
      expect(screen.getByLabelText('Descrição')).toHaveValue(
        'b'.repeat(TAG_DESCRIPTION_MAX_LENGTH),
      );
    });

    it('shows a duplicate-name conflict verbatim as a form-level banner, without navigating away (spec US2 scenario 3)', async () => {
      const user = userEvent.setup();
      mockCreate.mockResolvedValue({
        ok: false,
        error: {
          status: 409,
          code: 'Tag.DuplicateName',
          title: "Já existe uma etiqueta chamada 'Promoção'.",
          errors: {
            '': [
              { code: 'Tag.DuplicateName', message: "Já existe uma etiqueta chamada 'Promoção'." },
            ],
          },
        },
      });
      renderAt(['/tags/new']);
      await screen.findByRole('heading', { name: 'Nova etiqueta' });

      await user.type(screen.getByLabelText('Nome'), 'Promoção');
      await user.click(screen.getByRole('radio', { name: 'Âmbar' }));
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        "Já existe uma etiqueta chamada 'Promoção'.",
      );
      expect(screen.getByRole('heading', { name: 'Nova etiqueta' })).toBeInTheDocument();
      expect(screen.getByLabelText('Nome')).toHaveValue('Promoção');
    });

    it('maps a backend field validation error to the matching input (spec FR-012)', async () => {
      const user = userEvent.setup();
      mockCreate.mockResolvedValue({
        ok: false,
        error: {
          status: 400,
          code: 'Validation.Failed',
          title: 'Ocorreram erros de validação.',
          errors: {
            Name: [{ code: 'NotEmptyValidator', message: 'O nome da etiqueta é obrigatório.' }],
          },
        },
      });
      renderAt(['/tags/new']);
      await screen.findByRole('heading', { name: 'Nova etiqueta' });

      await user.type(screen.getByLabelText('Nome'), 'x');
      await user.click(screen.getByRole('radio', { name: 'Âmbar' }));
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      const nameError = await screen.findByText('O nome da etiqueta é obrigatório.');
      expect(nameError).toBeInTheDocument();
      expect(screen.getByLabelText('Nome')).toHaveAttribute('aria-invalid', 'true');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('closes without creating when Cancelar is clicked, with the search the list had still on screen (ADR 0074)', async () => {
      const user = userEvent.setup();
      mockList.mockImplementation(({ search }: TagListQuery) =>
        Promise.resolve(
          listOf(search ? TAGS.filter((tag) => tag.name.toLowerCase().includes(search)) : TAGS),
        ),
      );
      renderAt(['/tags']);
      await screen.findByText('VIP');
      await user.type(screen.getByLabelText('Buscar etiquetas por nome'), 'promo{Enter}');
      await waitFor(() => expect(screen.queryByText('VIP')).not.toBeInTheDocument());

      await user.click(screen.getByRole('link', { name: 'Nova etiqueta' }));
      await screen.findByRole('heading', { name: 'Nova etiqueta' });
      await user.click(screen.getByRole('button', { name: 'Cancelar' }));

      expect(mockCreate).not.toHaveBeenCalled();
      await waitFor(() =>
        expect(screen.getByTestId('location').textContent).toBe('location: /tags'),
      );
      expect(screen.getByLabelText('Buscar etiquetas por nome')).toHaveValue('promo');
      expect(screen.getByText('Promoção')).toBeInTheDocument();
      expect(screen.queryByText('VIP')).not.toBeInTheDocument();
      expect(mockList).toHaveBeenCalledTimes(2);
    });
  });

  describe('edit mode (/tags/:id/edit)', () => {
    it('shows a loading skeleton while the tag is being fetched, then reveals the form', async () => {
      const user = userEvent.setup();
      let resolveGet!: (result: { ok: true; data: Tag }) => void;
      mockGet.mockReturnValue(new Promise((resolve) => (resolveGet = resolve)));

      renderAt(['/tags']);
      await screen.findByText('Promoção');
      await user.click(screen.getByRole('link', { name: 'Editar Promoção' }));

      expect(await screen.findByRole('heading', { name: 'Editar etiqueta' })).toBeInTheDocument();
      expect(screen.queryByLabelText('Nome')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();

      resolveGet({ ok: true, data: TAGS[0]! });

      expect(await screen.findByLabelText('Nome')).toHaveValue('Promoção');
      expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled();
    });

    it('fetches the tag on a deep link without waiting for the list to load', async () => {
      mockList.mockReturnValue(new Promise(() => {}));
      renderAt(['/tags/1/edit']);

      expect(await screen.findByLabelText('Nome')).toHaveValue('Promoção');
      expect(mockGet).toHaveBeenCalledWith('1', expect.any(AbortSignal));
    });

    it('aborts the request in flight when the dialog goes away', async () => {
      mockGet.mockReturnValue(new Promise(() => {}));
      const { unmount } = renderAt(['/tags/1/edit']);
      await screen.findByRole('heading', { name: 'Editar etiqueta' });
      const signal = (mockGet.mock.calls as [string, AbortSignal][])[0]?.[1];
      expect(signal?.aborted).toBe(false);

      unmount();

      expect(signal?.aborted).toBe(true);
    });

    it('under StrictMode aborts the first of the two development requests and keeps the second', async () => {
      render(
        <StrictMode>
          <MemoryRouter initialEntries={['/tags/1/edit']}>
            <Routes>
              <Route path="tags" element={<TagListPage />}>
                <Route path=":id/edit" element={<TagFormPage />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </StrictMode>,
      );

      expect(await screen.findByLabelText('Nome')).toHaveValue('Promoção');
      const signals = (mockGet.mock.calls as [string, AbortSignal][]).map(([, signal]) => signal);
      expect(signals).toHaveLength(2);
      expect(signals[0]?.aborted).toBe(true);
      expect(signals[1]?.aborted).toBe(false);
    });

    it('still opens on a deep link when the list fails to load', async () => {
      mockList.mockResolvedValue({
        ok: false,
        error: { status: 0, code: 'Network.Unreachable', title: 'Sem conexão com o servidor.' },
      });
      renderAt(['/tags/1/edit']);

      expect(
        await screen.findByText('Não foi possível carregar as etiquetas.'),
      ).toBeInTheDocument();
      expect(await screen.findByLabelText('Nome')).toHaveValue('Promoção');
    });

    it('closes back to the list when Cancelar is clicked while still loading', async () => {
      const user = userEvent.setup();
      mockGet.mockReturnValue(new Promise(() => {}));

      renderAt(['/tags']);
      await screen.findByText('Promoção');
      await user.click(screen.getByRole('link', { name: 'Editar Promoção' }));
      await screen.findByRole('heading', { name: 'Editar etiqueta' });

      await user.click(screen.getByRole('button', { name: 'Cancelar' }));

      await waitFor(() =>
        expect(screen.getByTestId('location').textContent).toBe('location: /tags'),
      );
    });

    it('opens pre-filled with the fetched tag, titled "Editar etiqueta" (fresh from the backend, not the clicked row)', async () => {
      const user = userEvent.setup();
      renderAt(['/tags']);
      await screen.findByText('Promoção');

      await user.click(screen.getByRole('link', { name: 'Editar Promoção' }));

      expect(await screen.findByRole('heading', { name: 'Editar etiqueta' })).toBeInTheDocument();
      expect(await screen.findByLabelText('Nome')).toHaveValue('Promoção');
      expect(screen.getByLabelText('Descrição')).toHaveValue('Desconto temporário');
      expect(screen.getByRole('radio', { name: 'Âmbar' })).toHaveAttribute('aria-checked', 'true');
      expect(mockGet).toHaveBeenCalledWith('1', expect.any(AbortSignal));
    });

    it('goes back to loading and saves to the new tag when the route switches ids without remounting the page', async () => {
      const user = userEvent.setup();
      const router = createMemoryRouter(
        [
          {
            path: '/tags',
            element: <Outlet />,
            children: [{ path: ':id/edit', element: <TagFormPage /> }],
          },
        ],
        { initialEntries: ['/tags/1/edit'] },
      );
      render(<RouterProvider router={router} />);
      expect(await screen.findByLabelText('Nome')).toHaveValue('Promoção');

      let resolveGet!: (result: { ok: true; data: Tag }) => void;
      mockGet.mockReturnValueOnce(new Promise((resolve) => (resolveGet = resolve)));
      await act(() => router.navigate('/tags/2/edit'));

      expect(screen.queryByLabelText('Nome')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();

      resolveGet({ ok: true, data: TAGS[1]! });
      expect(await screen.findByLabelText('Nome')).toHaveValue('VIP');

      mockUpdate.mockResolvedValue({ ok: true, data: TAGS[1] });
      await user.click(screen.getByRole('button', { name: 'Salvar' }));
      expect(mockUpdate).toHaveBeenCalledWith('2', {
        name: 'VIP',
        color: '#8b5cf6',
        description: null,
      });
    });

    it('saves the change, refreshes the list and returns to /tags on success (spec US3 scenario 1)', async () => {
      const user = userEvent.setup();
      mockUpdate.mockResolvedValue({
        ok: true,
        data: {
          id: '1',
          name: 'Promo relâmpago',
          color: '#f59e0b',
          description: 'Desconto temporário',
        },
      });
      renderAt(['/tags']);
      await screen.findByText('Promoção');
      await user.click(screen.getByRole('link', { name: 'Editar Promoção' }));
      await screen.findByRole('heading', { name: 'Editar etiqueta' });

      const nameInput = await screen.findByLabelText('Nome');
      await user.clear(nameInput);
      await user.type(nameInput, 'Promo relâmpago');
      mockList.mockResolvedValue(
        listOf([
          {
            id: '1',
            name: 'Promo relâmpago',
            color: '#f59e0b',
            description: 'Desconto temporário',
          },
          TAGS[1]!,
        ]),
      );
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(mockUpdate).toHaveBeenCalledWith('1', {
        name: 'Promo relâmpago',
        color: '#f59e0b',
        description: 'Desconto temporário',
      });
      await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
      await waitFor(() =>
        expect(screen.getByTestId('location').textContent).toBe('location: /tags'),
      );
      expect(await screen.findByText('Promo relâmpago')).toBeInTheDocument();
    });

    it('shows a rename-to-duplicate conflict verbatim, without navigating away (spec US3 scenario 2)', async () => {
      const user = userEvent.setup();
      mockUpdate.mockResolvedValue({
        ok: false,
        error: {
          status: 409,
          code: 'Tag.DuplicateName',
          title: "Já existe uma etiqueta chamada 'VIP'.",
          errors: {
            '': [{ code: 'Tag.DuplicateName', message: "Já existe uma etiqueta chamada 'VIP'." }],
          },
        },
      });
      renderAt(['/tags']);
      await screen.findByText('Promoção');
      await user.click(screen.getByRole('link', { name: 'Editar Promoção' }));
      await screen.findByRole('heading', { name: 'Editar etiqueta' });

      const nameInput = await screen.findByLabelText('Nome');
      await user.clear(nameInput);
      await user.type(nameInput, 'VIP');
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        "Já existe uma etiqueta chamada 'VIP'.",
      );
      expect(mockList).toHaveBeenCalledTimes(1);
    });

    it('shows a toast with the backend message and returns to the list on a real 404 (deep link, refresh, shared URL, or a tag deleted meanwhile)', async () => {
      const toastModule = await import('@/shared/ui/toast');
      const toastAddSpy = vi.spyOn(toastModule.toast, 'add');
      renderAt(['/tags/missing-id/edit']);

      await waitFor(() =>
        expect(toastAddSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Não foi possível abrir a etiqueta',
            description: "Etiqueta 'missing-id' não foi encontrada.",
            data: {
              problem: {
                status: 404,
                code: 'Tag.NotFound',
                title: "Etiqueta 'missing-id' não foi encontrada.",
              },
            },
            type: 'error',
          }),
        ),
      );
      await waitFor(() =>
        expect(screen.getByTestId('location').textContent).toBe('location: /tags'),
      );
    });
  });

  describe('closing and browser history', () => {
    it('goes back to the list after saving, so the browser Back button does not reopen the dialog', async () => {
      const user = userEvent.setup();
      mockUpdate.mockResolvedValue({ ok: true, data: TAGS[0] });
      const router = renderRouterAt(['/tags']);
      await screen.findByText('Promoção');

      await user.click(screen.getByRole('link', { name: 'Editar Promoção' }));
      await screen.findByLabelText('Nome');
      await user.click(screen.getByRole('button', { name: 'Salvar' }));
      await waitFor(() =>
        expect(screen.getByTestId('location').textContent).toBe('location: /tags'),
      );

      await act(() => router.navigate(-1));

      expect(screen.getByTestId('location').textContent).toBe('location: /tags');
      expect(screen.queryByRole('heading', { name: 'Editar etiqueta' })).not.toBeInTheDocument();
    });

    it('stays where the person went when they leave with Back while the save is still in flight', async () => {
      const user = userEvent.setup();
      let resolveUpdate!: (result: { ok: true; data: Tag }) => void;
      mockUpdate.mockReturnValue(new Promise((resolve) => (resolveUpdate = resolve)));
      const router = renderRouterAt(['/tags?q=promo', '/tags']);
      await screen.findByText('Promoção');

      await user.click(screen.getByRole('link', { name: 'Editar Promoção' }));
      await screen.findByLabelText('Nome');
      await user.click(screen.getByRole('button', { name: 'Salvar' }));
      await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
      await act(() => router.navigate(-1));
      expect(screen.getByTestId('location').textContent).toBe('location: /tags');
      const navigate = vi.spyOn(router, 'navigate');

      resolveUpdate({ ok: true, data: TAGS[0]! });
      await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));

      expect(navigate).not.toHaveBeenCalled();
      expect(screen.getByTestId('location').textContent).toBe('location: /tags');
    });

    it('replaces a deep-linked dialog with the list on close, so Back does not reopen it either', async () => {
      const user = userEvent.setup();
      const router = renderRouterAt(['/tags/new']);
      await screen.findByRole('heading', { name: 'Nova etiqueta' });

      await user.click(screen.getByRole('button', { name: 'Cancelar' }));
      await waitFor(() =>
        expect(screen.getByTestId('location').textContent).toBe('location: /tags'),
      );

      await act(() => router.navigate(-1));

      expect(screen.getByTestId('location').textContent).toBe('location: /tags');
      expect(screen.queryByRole('heading', { name: 'Nova etiqueta' })).not.toBeInTheDocument();
    });
  });

  it('saves only from the visible Salvar control, without a Ctrl+S binding', async () => {
    const user = userEvent.setup();
    mockCreate.mockResolvedValue({
      ok: true,
      data: { id: '3', name: 'Sazonal', color: '#0ea5e9', description: null },
    });
    renderAt(['/tags/new']);
    await screen.findByRole('heading', { name: 'Nova etiqueta' });

    await user.type(screen.getByLabelText('Nome'), 'Sazonal');
    await user.click(screen.getByRole('radio', { name: 'Azul' }));
    await user.keyboard('{Control>}s{/Control}');
    expect(mockCreate).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
  });

  describe('focus and validation', () => {
    it('moves focus to Nome once the tag has loaded, so the keyboard lands in the form', async () => {
      renderAt(['/tags/1/edit']);

      const nameInput = await screen.findByLabelText('Nome');

      await waitFor(() => expect(nameInput).toHaveFocus());
    });

    it('moves focus to the color picker when it is the only invalid field', async () => {
      const user = userEvent.setup();
      renderAt(['/tags/new']);
      await screen.findByRole('heading', { name: 'Nova etiqueta' });

      await user.type(screen.getByLabelText('Nome'), 'Sazonal');
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      await waitFor(() =>
        expect(screen.getByRole('radio', { name: 'Verde-azulado' })).toHaveFocus(),
      );
    });
  });
});
