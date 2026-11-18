import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider, useLocation, type RouteObject } from 'react-router';
import { routerAt } from '@/test/renderRoutes';
import { TagListPage } from '../TagListPage/TagListPage';
import { TagDeletePage } from './TagDeletePage';
import type { Tag } from '../../../model/tag';
import type { TagListQuery } from '../../../model/tagListFilters';

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

function listOf(items: Tag[]) {
  return { ok: true, data: { items, totalCount: items.length, page: 1, pageSize: 20 } };
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`location: ${location.pathname}${location.search}`}</div>;
}

function routes(): RouteObject[] {
  return [
    {
      path: '/tags',
      handle: { crumb: 'Etiquetas' },
      element: (
        <>
          <TagListPage />
          <LocationProbe />
        </>
      ),
      children: [{ path: ':id/delete', element: <TagDeletePage /> }],
    },
  ];
}

function renderAt(initialEntries: string[]) {
  return render(routerAt(routes(), initialEntries));
}

describe('TagDeletePage', () => {
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

  it('opens the confirmation dialog for the tag clicked in the list, naming it', async () => {
    const user = userEvent.setup();
    renderAt(['/tags']);
    await screen.findByText('Promoção');

    await user.click(screen.getByRole('link', { name: 'Excluir Promoção' }));

    expect(screen.getByRole('heading', { name: 'Excluir etiqueta?' })).toBeInTheDocument();
    expect(await screen.findByText(PROMOCAO_CONFIRMATION)).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith('1', expect.any(AbortSignal));
  });

  it('opens from a deep link (refresh, bookmark or shared URL) by fetching the tag', async () => {
    renderAt(['/tags/1/delete']);

    expect(await screen.findByText(PROMOCAO_CONFIRMATION)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeEnabled();
  });

  it('aborts the request in flight when the dialog goes away', async () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    const { unmount } = renderAt(['/tags/1/delete']);
    await screen.findByRole('dialog');
    const signal = (mockGet.mock.calls as [string, AbortSignal][])[0]?.[1];
    expect(signal?.aborted).toBe(false);

    unmount();

    expect(signal?.aborted).toBe(true);
  });

  it('under StrictMode aborts the first of the two development requests and keeps the second', async () => {
    render(<StrictMode>{routerAt(routes(), ['/tags/1/delete'])}</StrictMode>);

    expect(await screen.findByText(PROMOCAO_CONFIRMATION)).toBeInTheDocument();
    const signals = (mockGet.mock.calls as [string, AbortSignal][]).map(([, signal]) => signal);
    expect(signals).toHaveLength(2);
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);
  });

  it('shows the question and the warning on separate lines', async () => {
    renderAt(['/tags/1/delete']);

    expect(await screen.findByText(PROMOCAO_CONFIRMATION)).toBeInTheDocument();
    expect(screen.getByText('Essa ação não pode ser desfeita.')).toBeInTheDocument();
  });

  it('announces the load and keeps Excluir disabled until the tag arrives', async () => {
    let resolveGet!: (result: { ok: true; data: Tag }) => void;
    mockGet.mockReturnValue(new Promise((resolve) => (resolveGet = resolve)));
    renderAt(['/tags/1/delete']);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('status')).toHaveTextContent('Carregando…');
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeDisabled();

    resolveGet({ ok: true, data: TAGS[0]! });

    expect(await screen.findByText(PROMOCAO_CONFIRMATION)).toBeInTheDocument();
    expect(within(dialog).queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeEnabled();
  });

  it('deletes the tag, reloads the list from the backend and returns to /tags on confirm', async () => {
    const user = userEvent.setup();
    mockDelete.mockResolvedValue({ ok: true, data: undefined });
    renderAt(['/tags']);
    await screen.findByText('Promoção');

    await user.click(screen.getByRole('link', { name: 'Excluir Promoção' }));
    await screen.findByText(PROMOCAO_CONFIRMATION);
    mockList.mockResolvedValue(listOf(TAGS.filter((tag) => tag.id !== '1')));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(mockDelete).toHaveBeenCalledWith('1');
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText('Promoção')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('location: /tags'));
    expect(screen.queryByRole('heading', { name: 'Excluir etiqueta?' })).not.toBeInTheDocument();
  });

  it('shows the backend error verbatim and keeps the tag when delete is blocked', async () => {
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

  it('opens people and services edit paths in a new tab', async () => {
    const user = userEvent.setup();
    mockDelete.mockResolvedValue({
      ok: false,
      error: {
        status: 409,
        code: 'Tag.InUse',
        title: 'Etiqueta em uso.',
        errors: {
          Clients: [{ code: 'Tag.InUse', meta: { id: 'abc/123', name: 'Ana Lima' } }],
          Services: [{ code: 'Tag.InUse', meta: { id: 'service-1', name: 'Massagem' } }],
        },
      },
    });
    renderAt(['/tags/1/delete']);
    await screen.findByText(PROMOCAO_CONFIRMATION);
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    const link = await screen.findByRole('link', { name: /Ana Lima.*outra aba/ });
    expect(link).toHaveAttribute('href', '/pessoas/abc%2F123/editar');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    const serviceLink = screen.getByRole('link', { name: /Massagem.*outra aba/ });
    expect(serviceLink).toHaveAttribute('href', '/servicos/service-1/editar');
    expect(serviceLink).toHaveAttribute('target', '_blank');
    expect(serviceLink).toHaveAttribute('rel', 'noopener noreferrer');
    expect(
      screen.getByText('O gerenciamento de serviços ainda não está disponível.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Mostramos até 10/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Não é possível excluir' })).toHaveFocus();
    await user.tab();
    expect(link).toHaveFocus();
  });

  it('shows the backend totals and received names without extra limit notices', async () => {
    const user = userEvent.setup();
    const entries = Array.from({ length: 10 }, (_, i) => ({
      code: 'Tag.InUse',
      meta: { id: String(i), name: `Pessoa ${i}` },
    }));
    mockDelete.mockResolvedValue({
      ok: false,
      error: {
        status: 409,
        code: 'Tag.InUse',
        title:
          'Esta etiqueta está em uso por 11 serviço(s) e 12 pessoa(s) e não pode ser excluída.',
        errors: {
          Clients: entries,
          Services: entries.map((entry) => ({
            ...entry,
            meta: { ...entry.meta, name: `Serviço ${entry.meta.id}` },
          })),
        },
      },
    });
    renderAt(['/tags/1/delete']);
    await screen.findByText(PROMOCAO_CONFIRMATION);
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(
      await screen.findByText(
        'Esta etiqueta está em uso por 11 serviço(s) e 12 pessoa(s) e não pode ser excluída.',
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Pessoas' })).getAllByRole('listitem'),
    ).toHaveLength(10);
    expect(
      within(screen.getByRole('region', { name: 'Serviços' })).getAllByRole('listitem'),
    ).toHaveLength(10);
    expect(screen.queryByText(/Mostramos até 10/)).not.toBeInTheDocument();
  });

  it('handles incomplete entries without inventing names or links', async () => {
    const user = userEvent.setup();
    mockDelete.mockResolvedValue({
      ok: false,
      error: {
        status: 409,
        code: 'Tag.InUse',
        title: 'Etiqueta em uso.',
        errors: {
          Clients: [
            null,
            {},
            { meta: { name: 'Sem identificador' } },
            { meta: { id: '123' } },
            { meta: { name: 'ID inválido', id: '..' } },
          ],
          Services: null,
        },
      },
    });
    renderAt(['/tags/1/delete']);
    await screen.findByText(PROMOCAO_CONFIRMATION);
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(await screen.findByText('Sem identificador')).toBeInTheDocument();
    expect(screen.getByText('ID inválido')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Sem identificador|ID inválido/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Serviços' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar excluir novamente' })).toBeEnabled();
  });

  it('shows unknown usage groups without inventing labels or links', async () => {
    const user = userEvent.setup();
    mockDelete.mockResolvedValue({
      ok: false,
      error: {
        status: 409,
        code: 'Tag.InUse',
        title: 'Etiqueta em uso.',
        errors: {
          Clients: [{ code: 'Tag.InUse', meta: { id: 'client-1', name: 'Ana' } }],
          Appointments: [
            {
              code: 'Tag.InUse',
              meta: { id: 'unknown-1', name: 'Atendimento especial', url: 'https://example.com' },
            },
            { code: 'Another.Error', meta: { name: 'Não exibir' } },
            { meta: { name: 'Sem código' } },
            null,
            { code: 'Tag.InUse', meta: { id: 'missing-name' } },
          ],
        },
      },
    });
    renderAt(['/tags/1/delete']);
    await screen.findByText(PROMOCAO_CONFIRMATION);
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    const other = await screen.findByRole('region', { name: 'Outros vínculos' });
    expect(within(other).getByText('Atendimento especial')).toBeInTheDocument();
    expect(within(other).queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByText('Appointments')).not.toBeInTheDocument();
    expect(screen.queryByText('Não exibir')).not.toBeInTheDocument();
    expect(screen.queryByText('Sem código')).not.toBeInTheDocument();
    expect(screen.queryByText(/Mostramos até 10 registros/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ana/ })).toBeInTheDocument();
  });

  it('shows all received records in an unknown group without an extra limit notice', async () => {
    const user = userEvent.setup();
    const entries = Array.from({ length: 10 }, (_, i) => ({
      code: 'Tag.InUse',
      meta: { id: String(i), name: `Vínculo ${i}` },
    }));
    mockDelete.mockResolvedValue({
      ok: false,
      error: {
        status: 409,
        code: 'Tag.InUse',
        title: 'Etiqueta em uso.',
        errors: { NewFeature: entries },
      },
    });
    renderAt(['/tags/1/delete']);
    await screen.findByText(PROMOCAO_CONFIRMATION);
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(await screen.findByText('Etiqueta em uso.')).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Outros vínculos' })).getAllByRole('listitem'),
    ).toHaveLength(10);
    expect(screen.queryByText('NewFeature')).not.toBeInTheDocument();
    expect(screen.queryByText(/Mostramos até 10/)).not.toBeInTheDocument();
  });

  it('retries explicitly and replaces the blocked details with the new response before success', async () => {
    const user = userEvent.setup();
    const blocked = (name: string) => ({
      ok: false,
      error: {
        status: 409,
        code: 'Tag.InUse',
        title: 'Etiqueta em uso.',
        errors: {
          Clients: [{ code: 'Tag.InUse', meta: { id: name, name } }],
        },
      },
    });
    mockDelete
      .mockResolvedValueOnce(blocked('Ana'))
      .mockResolvedValueOnce(blocked('Bia'))
      .mockResolvedValueOnce({ ok: true, data: undefined });
    renderAt(['/tags/1/delete']);
    await screen.findByText(PROMOCAO_CONFIRMATION);
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    await screen.findByRole('link', { name: /Ana/ });
    await user.click(screen.getByRole('button', { name: 'Tentar excluir novamente' }));
    expect(await screen.findByRole('link', { name: /Bia/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Ana/ })).not.toBeInTheDocument();
    expect(mockDelete).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole('button', { name: 'Tentar excluir novamente' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mockDelete).toHaveBeenCalledTimes(3);
  });

  it('keeps the blocked details and disables actions while retrying, then preserves transient error handling', async () => {
    const user = userEvent.setup();
    let resolveRetry!: (value: unknown) => void;
    mockDelete
      .mockResolvedValueOnce({
        ok: false,
        error: {
          status: 409,
          code: 'Tag.InUse',
          title: 'Etiqueta em uso.',
          errors: {
            Clients: [{ code: 'Tag.InUse', meta: { id: '123', name: 'Ana' } }],
          },
        },
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRetry = resolve;
          }),
      );
    renderAt(['/tags/1/delete']);
    await screen.findByText(PROMOCAO_CONFIRMATION);
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    await screen.findByRole('link', { name: /Ana/ });
    await user.click(screen.getByRole('button', { name: 'Tentar excluir novamente' }));
    expect(screen.getByRole('link', { name: /Ana/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar excluir novamente' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Entendi' })).toBeDisabled();
    resolveRetry({
      ok: false,
      error: { status: 0, code: 'Network.Unreachable', title: 'Sem conexão.' },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão.');
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeEnabled();
  });

  it('offers an explicit retry for other permanent errors without inventing related records', async () => {
    const user = userEvent.setup();
    mockDelete
      .mockResolvedValueOnce({
        ok: false,
        error: { status: 409, code: 'Tag.SaveFailed', title: 'Não foi possível excluir.' },
      })
      .mockResolvedValueOnce({ ok: true, data: undefined });
    renderAt(['/tags/1/delete']);
    await screen.findByText(PROMOCAO_CONFIRMATION);
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(await screen.findByText('Não foi possível excluir.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Pessoas' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entendi' })).toBeInTheDocument();
    expect(mockDelete).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Tentar excluir novamente' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mockDelete).toHaveBeenCalledTimes(2);
  });

  it('goes back to the list after deleting, so the browser Back button does not reopen the confirmation', async () => {
    const user = userEvent.setup();
    mockDelete.mockResolvedValue({ ok: true, data: undefined });
    const router = createMemoryRouter(
      [
        {
          path: '/tags',
          handle: { crumb: 'Etiquetas' },
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

  it('stays where the person went when they leave with Back while the deletion is still in flight', async () => {
    const user = userEvent.setup();
    let resolveDelete!: (result: { ok: true; data: undefined }) => void;
    mockDelete.mockReturnValue(new Promise((resolve) => (resolveDelete = resolve)));
    const router = createMemoryRouter(
      [
        {
          path: '/tags',
          handle: { crumb: 'Etiquetas' },
          element: (
            <>
              <TagListPage />
              <LocationProbe />
            </>
          ),
          children: [{ path: ':id/delete', element: <TagDeletePage /> }],
        },
      ],
      { initialEntries: ['/tags?q=vip', '/tags'] },
    );
    render(<RouterProvider router={router} />);
    await screen.findByText('VIP');

    await user.click(screen.getByRole('link', { name: 'Excluir VIP' }));
    await screen.findByText(/excluir a etiqueta "VIP"/);
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('2'));
    await act(() => router.navigate(-1));
    expect(screen.getByTestId('location').textContent).toBe('location: /tags');
    const navigate = vi.spyOn(router, 'navigate');

    resolveDelete({ ok: true, data: undefined });
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));

    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByTestId('location').textContent).toBe('location: /tags');
  });

  it('closes without deleting when Cancelar is clicked, with the search the list had still on screen and in the address', async () => {
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

    await user.click(screen.getByRole('link', { name: 'Excluir Promoção' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(mockDelete).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByTestId('location').textContent).toBe('location: /tags?search=promo'),
    );
    expect(screen.getByLabelText('Buscar etiquetas por nome')).toHaveValue('promo');
    expect(screen.getByText('Promoção')).toBeInTheDocument();
    expect(screen.queryByText('VIP')).not.toBeInTheDocument();
    expect(mockList).toHaveBeenCalledTimes(2);
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
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('location: /tags'));
    toastAddSpy.mockRestore();
  });

  it('returns to /tags, leaving behind the search its address carried, when a deep-linked tag does not exist', async () => {
    renderAt(['/tags/missing-id/delete?search=promo']);

    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('location: /tags'));
  });

  it('shows that toast only once under StrictMode, whose double-run effect would otherwise repeat it', async () => {
    const toastModule = await import('@/shared/ui/toast');
    const toastAddSpy = vi.spyOn(toastModule.toast, 'add');
    render(<StrictMode>{routerAt(routes(), ['/tags/missing-id/delete'])}</StrictMode>);

    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('location: /tags'));
    const notFoundToasts = toastAddSpy.mock.calls.filter(
      ([options]) => options.title === 'Não foi possível abrir a etiqueta',
    );
    expect(notFoundToasts).toHaveLength(1);
    toastAddSpy.mockRestore();
  });

  describe('native keyboard focus', () => {
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
  });
});
