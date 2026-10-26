import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider, useLocation, type RouteObject } from 'react-router';
import { toast } from '@/shared/ui/toast';
import { routerAt } from '@/test/renderRoutes';
import { ClientListPage } from '../ClientListPage/ClientListPage';
import { ClientDeletePage } from './ClientDeletePage';
import type { Client } from '../../../model/client';
import type { ClientListItem } from '../../../model/clientList';

const { mockList, mockGet, mockDelete } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockGet: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock('../../../api/clientsRepository', () => ({
  clientsRepository: { list: mockList, get: mockGet, delete: mockDelete },
}));

const ANA: Client = {
  id: 'c1',
  fullName: 'Ana Souza',
  birthDate: null,
  phone: '(11) 91234-5678',
  email: 'ana@example.com',
  cpf: '52998224725',
  administrativeNotes: null,
  status: 'active',
  guardians: [],
  referenceContacts: [],
};

const BRUNO: Client = {
  ...ANA,
  id: 'c2',
  fullName: 'Bruno Lima',
  phone: null,
  email: null,
  cpf: null,
  status: 'inactive',
};

const CLIENTS = [ANA, BRUNO];

const ANA_CONFIRMATION = 'Tem certeza que deseja excluir Ana Souza?';

function listItemOf({ id, fullName, phone, email, cpf, status }: Client): ClientListItem {
  return { id, fullName, phone, email, cpf, status };
}

function listOf(clients: Client[]) {
  return {
    ok: true,
    data: { items: clients.map(listItemOf), totalCount: clients.length, page: 1, pageSize: 20 },
  };
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`location: ${location.pathname}${location.search}`}</div>;
}

function routes(): RouteObject[] {
  return [
    {
      path: '/pessoas',
      handle: { crumb: 'Pessoas' },
      element: (
        <>
          <ClientListPage />
          <LocationProbe />
        </>
      ),
      children: [{ path: ':id/excluir', element: <ClientDeletePage /> }],
    },
  ];
}

function renderAt(initialEntries: string[]) {
  return render(routerAt(routes(), initialEntries));
}

function location() {
  return screen.getByTestId('location').textContent;
}

async function openDeletionOfAna(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByText('Ana Souza');
  await user.click(screen.getByRole('link', { name: 'Excluir Ana Souza' }));
  await screen.findByText(ANA_CONFIRMATION);
}

describe('ClientDeletePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue(listOf(CLIENTS));
    mockGet.mockImplementation((id: string) => {
      const client = CLIENTS.find((candidate) => candidate.id === id);
      return Promise.resolve(
        client
          ? { ok: true, data: client }
          : {
              ok: false,
              error: {
                status: 404,
                code: 'Client.NotFound',
                title: 'A pessoa não foi encontrada.',
              },
            },
      );
    });
  });

  it('opens the confirmation over the list for the person clicked, naming them', async () => {
    const user = userEvent.setup();
    renderAt(['/pessoas']);

    await openDeletionOfAna(user);

    expect(screen.getByRole('heading', { name: 'Excluir pessoa?' })).toBeInTheDocument();
    expect(screen.getByText('Essa ação não pode ser desfeita.')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Pessoas', hidden: true })).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith('c1', expect.any(AbortSignal));
  });

  it('opens from a deep link by fetching the person, inactive ones included', async () => {
    renderAt(['/pessoas/c2/excluir']);

    expect(
      await screen.findByText('Tem certeza que deseja excluir Bruno Lima?'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeEnabled();
  });

  it('announces the load and keeps Excluir disabled until the person arrives', async () => {
    let resolveGet!: (result: { ok: true; data: Client }) => void;
    mockGet.mockReturnValue(new Promise((resolve) => (resolveGet = resolve)));
    renderAt(['/pessoas/c1/excluir']);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('status')).toHaveTextContent('Carregando…');
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeDisabled();

    resolveGet({ ok: true, data: ANA });

    expect(await screen.findByText(ANA_CONFIRMATION)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeEnabled();
  });

  it('aborts the request in flight when the dialog goes away', async () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    const { unmount } = renderAt(['/pessoas/c1/excluir']);
    await screen.findByRole('dialog');
    const signal = (mockGet.mock.calls as [string, AbortSignal][])[0]?.[1];
    expect(signal?.aborted).toBe(false);

    unmount();

    expect(signal?.aborted).toBe(true);
  });

  it('under StrictMode aborts the first of the two development requests and keeps the second', async () => {
    render(<StrictMode>{routerAt(routes(), ['/pessoas/c1/excluir'])}</StrictMode>);

    expect(await screen.findByText(ANA_CONFIRMATION)).toBeInTheDocument();
    const signals = (mockGet.mock.calls as [string, AbortSignal][]).map(([, signal]) => signal);
    expect(signals).toHaveLength(2);
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);
  });

  it('deletes the person, says so, reloads the list and goes back to it with its filters', async () => {
    const user = userEvent.setup();
    const toastAddSpy = vi.spyOn(toast, 'add');
    mockDelete.mockResolvedValue({ ok: true, data: undefined });
    renderAt(['/pessoas?status=all']);
    await openDeletionOfAna(user);
    mockList.mockResolvedValue(listOf([BRUNO]));

    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(mockDelete).toHaveBeenCalledWith('c1');
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
    expect(mockList).toHaveBeenLastCalledWith(
      { search: '', status: 'all', page: 1, pageSize: 20 },
      expect.any(AbortSignal),
    );
    await waitFor(() => expect(screen.queryByText('Ana Souza')).not.toBeInTheDocument());
    await waitFor(() => expect(location()).toBe('location: /pessoas?status=all'));
    expect(screen.queryByRole('heading', { name: 'Excluir pessoa?' })).not.toBeInTheDocument();
    expect(toastAddSpy).toHaveBeenCalledWith({
      title: 'Pessoa excluída',
      description: 'O cadastro de Ana Souza foi excluído.',
      type: 'success',
    });
    toastAddSpy.mockRestore();
  });

  it('shows the backend reason verbatim and keeps the person when appointments block the deletion', async () => {
    const user = userEvent.setup();
    mockDelete.mockResolvedValue({
      ok: false,
      error: {
        status: 409,
        code: 'Client.HasAppointments',
        title:
          'Não é possível excluir esta pessoa porque ela tem agendamentos registrados, inclusive passados ou cancelados. Se ela não for mais atendida, desative o cadastro.',
      },
    });
    renderAt(['/pessoas']);
    await openDeletionOfAna(user);

    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(await screen.findByText('Não é possível excluir')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Não é possível excluir esta pessoa porque ela tem agendamentos registrados, inclusive passados ou cancelados. Se ela não for mais atendida, desative o cadastro.',
      ),
    ).toBeInTheDocument();
    expect(mockList).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
  });

  it('closes without deleting when Cancelar is clicked, with the filters still in the address', async () => {
    const user = userEvent.setup();
    renderAt(['/pessoas?status=all']);
    await openDeletionOfAna(user);

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(mockDelete).not.toHaveBeenCalled();
    await waitFor(() => expect(location()).toBe('location: /pessoas?status=all'));
    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
    expect(mockList).toHaveBeenCalledTimes(1);
  });

  it('goes back to the list after deleting, so the browser Back button does not reopen the confirmation', async () => {
    const user = userEvent.setup();
    mockDelete.mockResolvedValue({ ok: true, data: undefined });
    const router = createMemoryRouter(routes(), { initialEntries: ['/pessoas'] });
    render(<RouterProvider router={router} />);
    await openDeletionOfAna(user);

    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(location()).toBe('location: /pessoas'));

    await act(() => router.navigate(-1));

    expect(location()).toBe('location: /pessoas');
    expect(screen.queryByRole('heading', { name: 'Excluir pessoa?' })).not.toBeInTheDocument();
  });

  it('warns with the backend message and goes to the list when the person cannot be opened', async () => {
    const serverErrorSpy = vi.spyOn(toast, 'serverError');
    renderAt(['/pessoas/missing/excluir?status=all']);

    await waitFor(() =>
      expect(serverErrorSpy).toHaveBeenCalledWith('Não foi possível abrir a pessoa', {
        status: 404,
        code: 'Client.NotFound',
        title: 'A pessoa não foi encontrada.',
      }),
    );
    await waitFor(() => expect(location()).toBe('location: /pessoas'));
    expect(mockDelete).not.toHaveBeenCalled();
    serverErrorSpy.mockRestore();
  });
});
