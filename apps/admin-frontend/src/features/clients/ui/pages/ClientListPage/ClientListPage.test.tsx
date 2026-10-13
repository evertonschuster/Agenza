import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, MemoryRouter, RouterProvider, useLocation } from 'react-router';
import { ClientListPage } from './ClientListPage';
import type { ClientList, ClientListItem } from '../../../model/clientList';

const { mockList } = vi.hoisted(() => ({ mockList: vi.fn() }));

vi.mock('../../../api/clientsRepository', () => ({
  clientsRepository: { list: mockList },
}));

const SEARCH_LABEL = 'Buscar pessoas por nome, e-mail ou CPF';

const ANA: ClientListItem = {
  id: 'c1',
  fullName: 'Ana Souza',
  phone: '(11) 91234-5678',
  email: 'ana@example.com',
  cpf: '52998224725',
  status: 'active',
};

const BRUNO: ClientListItem = {
  id: 'c2',
  fullName: 'Bruno Lima',
  phone: null,
  email: null,
  cpf: null,
  status: 'inactive',
};

const CLIENTS = [ANA, BRUNO];

function listOf(
  items: ClientListItem[],
  totalCount = items.length,
): { ok: true; data: ClientList } {
  return { ok: true, data: { items, totalCount } };
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`location: ${location.pathname}${location.search}`}</div>;
}

function renderClientListPage(initialEntries: string[] = ['/pessoas']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ClientListPage />
      <LocationProbe />
    </MemoryRouter>,
  );
}

function renderPage(clients: ClientListItem[], initialEntries?: string[]) {
  mockList.mockImplementation((search?: string) => {
    const needle = search?.toLowerCase();
    const filtered = needle
      ? clients.filter((client) => client.fullName.toLowerCase().includes(needle))
      : clients;
    return Promise.resolve(listOf(filtered));
  });
  return renderClientListPage(initialEntries);
}

describe('ClientListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the table loading skeleton on first render, before the initial fetch resolves', async () => {
    let resolveInitial!: (value: ReturnType<typeof listOf>) => void;
    mockList.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveInitial = resolve;
        }),
    );

    const { container } = renderClientListPage();

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByText('Nenhuma pessoa ativa ainda')).not.toBeInTheDocument();

    resolveInitial(listOf(CLIENTS));

    await waitFor(() => expect(screen.getByText('Ana Souza')).toBeInTheDocument());
    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it('asks for the first page of active people with no search on the first load', async () => {
    renderPage(CLIENTS);
    await screen.findByText('Ana Souza');

    expect(mockList).toHaveBeenCalledTimes(1);
    expect(mockList).toHaveBeenCalledWith(undefined, expect.any(AbortSignal));
  });

  it('renders the Pessoas title and a "Nova pessoa" link pointing at the registration form', async () => {
    renderPage(CLIENTS);

    expect(await screen.findByRole('heading', { name: 'Pessoas' })).toBeInTheDocument();
    const newClient = screen.getByRole('link', { name: 'Nova pessoa' });
    expect(newClient).toHaveAttribute('href', '/pessoas/nova');
    expect(newClient.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('lists name, phone, e-mail, CPF and situation under their own column headers', async () => {
    renderPage(CLIENTS);

    const table = await screen.findByRole('table', { name: 'Pessoas' });
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((header) => header.textContent);
    expect(headers).toEqual(['Nome', 'Telefone', 'E-mail', 'CPF', 'Situação']);

    const anaRow = screen.getByRole('row', { name: /Ana Souza/ });
    expect(within(anaRow).getByText('(11) 91234-5678')).toBeInTheDocument();
    expect(within(anaRow).getByText('ana@example.com')).toBeInTheDocument();
    expect(within(anaRow).getByText('Ativa')).toBeInTheDocument();
  });

  it('shows the whole CPF, formatted, as the backend sends it (ADR 0067)', async () => {
    renderPage(CLIENTS);

    expect(await screen.findByText('529.982.247-25')).toBeInTheDocument();
    expect(screen.queryByText(/\*/)).not.toBeInTheDocument();
  });

  it('marks an inactive person as inactive and an active one as active', async () => {
    renderPage(CLIENTS);

    const anaRow = await screen.findByRole('row', { name: /Ana Souza/ });
    const brunoRow = screen.getByRole('row', { name: /Bruno Lima/ });
    expect(within(anaRow).getByText('Ativa')).toBeInTheDocument();
    expect(within(brunoRow).getByText('Inativa')).toBeInTheDocument();
    expect(within(brunoRow).queryByText('Ativa')).not.toBeInTheDocument();
  });

  it('colors the situation by its status: green for active, neutral gray for inactive', async () => {
    renderPage(CLIENTS);

    const anaRow = await screen.findByRole('row', { name: /Ana Souza/ });
    const brunoRow = screen.getByRole('row', { name: /Bruno Lima/ });

    expect(within(anaRow).getByText('Ativa')).toHaveAttribute('data-variant', 'success');
    expect(within(brunoRow).getByText('Inativa')).toHaveAttribute('data-variant', 'muted');
  });

  it('says "Não informado" to assistive tech, and shows a dash, for each missing phone, e-mail and CPF', async () => {
    renderPage([BRUNO]);

    const brunoRow = await screen.findByRole('row', { name: /Bruno Lima/ });

    expect(within(brunoRow).getAllByText('Não informado')).toHaveLength(3);
    expect(within(brunoRow).getAllByText('—')).toHaveLength(3);
  });

  it('links each name to that person under /pessoas/:id', async () => {
    renderPage(CLIENTS);

    expect(await screen.findByRole('link', { name: 'Ana Souza' })).toHaveAttribute(
      'href',
      '/pessoas/c1',
    );
    expect(screen.getByRole('link', { name: 'Bruno Lima' })).toHaveAttribute('href', '/pessoas/c2');
  });

  it('tells how many people are shown out of how many exist when the list was cut off', async () => {
    mockList.mockResolvedValue(listOf(CLIENTS, 1234));

    renderClientListPage();

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Exibindo 2 de 1.234 pessoas ativas.',
    );
  });

  it('shows no count line when every person fits in the list', async () => {
    renderPage(CLIENTS);
    await screen.findByText('Ana Souza');

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('limits the search field to what the backend accepts', async () => {
    renderPage(CLIENTS);

    expect(screen.getByLabelText(SEARCH_LABEL)).toHaveAttribute('maxlength', '254');
    await screen.findByText('Ana Souza');
  });

  it('shows the failure with the backend message and its code, not an empty list, when the fetch fails', async () => {
    mockList.mockResolvedValue({
      ok: false,
      error: {
        status: 0,
        code: 'Server.Unavailable',
        title: 'O servidor está instável. Tente novamente em instantes.',
      },
    });

    renderClientListPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Não foi possível carregar as pessoas.');
    expect(alert).toHaveTextContent('O servidor está instável. Tente novamente em instantes.');
    expect(alert).toHaveTextContent('Código: Server.Unavailable');
    expect(screen.queryByText('Nenhuma pessoa ativa ainda')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('retries the same search from the failure, showing the skeleton while it reloads', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValueOnce({
      ok: false,
      error: { title: 'Sem conexão com o servidor. Tente novamente.' },
    });
    let resolveRetry!: (value: ReturnType<typeof listOf>) => void;
    mockList.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRetry = resolve;
        }),
    );
    const { container } = renderClientListPage(['/pessoas?q=ana']);

    await user.click(await screen.findByRole('button', { name: 'Tentar novamente' }));

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(mockList).toHaveBeenLastCalledWith('ana', expect.any(AbortSignal));

    resolveRetry(listOf([ANA]));

    expect(await screen.findByText('Ana Souza')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('says there is nobody yet, without a search action, when the list is empty and nothing was searched', async () => {
    renderPage([]);

    expect(await screen.findByText('Nenhuma pessoa ativa ainda')).toBeInTheDocument();
    expect(screen.getByText('Use o botão Nova pessoa para cadastrar a primeira.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Limpar busca' })).not.toBeInTheDocument();
  });

  it('names the search term, and offers to clear it, when a search finds nobody', async () => {
    const user = userEvent.setup();
    renderPage(CLIENTS);
    await screen.findByText('Ana Souza');

    await user.type(screen.getByLabelText(SEARCH_LABEL), 'zzz{Enter}');

    expect(await screen.findByText('Nenhuma pessoa encontrada para «zzz»')).toBeInTheDocument();
    expect(screen.queryByText('Nenhuma pessoa ativa ainda')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Limpar busca' })).toBeInTheDocument();
  });

  it('clears the search, the URL and the field, and lists everyone again, from "Limpar busca"', async () => {
    const user = userEvent.setup();
    renderPage(CLIENTS, ['/pessoas?q=zzz']);
    await user.click(await screen.findByRole('button', { name: 'Limpar busca' }));

    expect(await screen.findByText('Ana Souza')).toBeInTheDocument();
    expect(screen.getByTestId('location').textContent).toBe('location: /pessoas');
    expect(screen.getByLabelText(SEARCH_LABEL)).toHaveValue('');
  });

  it('does not search while typing — only once submitted', async () => {
    const user = userEvent.setup();
    renderPage(CLIENTS);
    await screen.findByText('Ana Souza');

    await user.type(screen.getByLabelText(SEARCH_LABEL), 'bruno');

    expect(mockList).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
  });

  it('narrows the list to the submitted term and puts it in the URL as ?q=', async () => {
    const user = userEvent.setup();
    renderPage(CLIENTS);
    await screen.findByText('Ana Souza');

    await user.type(screen.getByLabelText(SEARCH_LABEL), 'bruno{Enter}');

    await waitFor(() => expect(screen.queryByText('Ana Souza')).not.toBeInTheDocument());
    expect(screen.getByText('Bruno Lima')).toBeInTheDocument();
    expect(mockList).toHaveBeenLastCalledWith('bruno', expect.any(AbortSignal));
    expect(screen.getByTestId('location').textContent).toBe('location: /pessoas?q=bruno');
  });

  it('searches from the Buscar button too', async () => {
    const user = userEvent.setup();
    renderPage(CLIENTS);
    await screen.findByText('Ana Souza');

    await user.type(screen.getByLabelText(SEARCH_LABEL), 'bruno');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    await waitFor(() => expect(screen.queryByText('Ana Souza')).not.toBeInTheDocument());
    expect(screen.getByText('Bruno Lima')).toBeInTheDocument();
  });

  it('reads the initial search from the URL, pre-filling the field and filtering the first fetch', async () => {
    renderPage(CLIENTS, ['/pessoas?q=bruno']);

    expect(screen.getByLabelText(SEARCH_LABEL)).toHaveValue('bruno');
    await waitFor(() => expect(mockList).toHaveBeenCalledWith('bruno', expect.any(AbortSignal)));
    expect(await screen.findByText('Bruno Lima')).toBeInTheDocument();
    expect(screen.queryByText('Ana Souza')).not.toBeInTheDocument();
  });

  it('removes ?q= instead of leaving it empty when the search is submitted blank', async () => {
    const user = userEvent.setup();
    renderPage(CLIENTS, ['/pessoas?q=bruno']);
    await screen.findByText('Bruno Lima');

    await user.clear(screen.getByLabelText(SEARCH_LABEL));
    await user.keyboard('{Enter}');

    await waitFor(() =>
      expect(screen.getByTestId('location').textContent).toBe('location: /pessoas'),
    );
  });

  it('shows the loading skeleton while a new search is in flight, replacing the stale rows', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValueOnce(listOf(CLIENTS));
    const { container } = renderClientListPage();
    await screen.findByText('Ana Souza');

    let resolveSearch!: (value: ReturnType<typeof listOf>) => void;
    mockList.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSearch = resolve;
        }),
    );

    await user.type(screen.getByLabelText(SEARCH_LABEL), 'bruno{Enter}');

    await waitFor(() => expect(container.querySelector('[aria-busy="true"]')).not.toBeNull());
    expect(screen.queryByText('Ana Souza')).not.toBeInTheDocument();
    expect(screen.queryByText('Nenhuma pessoa encontrada para «bruno»')).not.toBeInTheDocument();

    resolveSearch(listOf([BRUNO]));

    await waitFor(() => expect(screen.getByText('Bruno Lima')).toBeInTheDocument());
    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it('keeps the newer search result even if the older, superseded request resolves later', async () => {
    const user = userEvent.setup();
    renderPage(CLIENTS);
    await screen.findByText('Ana Souza');

    let resolveFirst!: (value: ReturnType<typeof listOf>) => void;
    mockList.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    );
    const searchInput = screen.getByLabelText(SEARCH_LABEL);
    await user.type(searchInput, 'bruno{Enter}');
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));

    let resolveSecond!: (value: ReturnType<typeof listOf>) => void;
    mockList.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSecond = resolve;
        }),
    );
    await user.clear(searchInput);
    await user.type(searchInput, 'ana{Enter}');
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(3));

    await act(async () => {
      resolveSecond(listOf([ANA]));
      await Promise.resolve();
    });
    expect(screen.getByText('Ana Souza')).toBeInTheDocument();

    await act(async () => {
      resolveFirst(listOf([BRUNO]));
      await Promise.resolve();
    });
    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
    expect(screen.queryByText('Bruno Lima')).not.toBeInTheDocument();
  });

  it('keeps keyboard focus on the search field after submitting, so the person can keep typing', async () => {
    const user = userEvent.setup();
    renderPage(CLIENTS);
    await screen.findByText('Ana Souza');

    const searchInput = screen.getByLabelText(SEARCH_LABEL);
    await user.type(searchInput, 'bruno{Enter}');

    await waitFor(() => expect(screen.queryByText('Ana Souza')).not.toBeInTheDocument());
    expect(searchInput).toHaveFocus();
  });

  it('shows the search term of the current URL again when Back and Forward change ?q=', async () => {
    const user = userEvent.setup();
    mockList.mockImplementation((search?: string) =>
      Promise.resolve(
        listOf(
          search
            ? CLIENTS.filter((client) => client.fullName.toLowerCase().includes(search))
            : CLIENTS,
        ),
      ),
    );
    const router = createMemoryRouter([{ path: '/pessoas', element: <ClientListPage /> }], {
      initialEntries: ['/pessoas'],
    });
    render(<RouterProvider router={router} />);
    await screen.findByText('Ana Souza');

    const searchInput = screen.getByLabelText(SEARCH_LABEL);
    await user.type(searchInput, 'bruno{Enter}');
    await waitFor(() => expect(screen.queryByText('Ana Souza')).not.toBeInTheDocument());

    await act(() => router.navigate(-1));

    expect(await screen.findByText('Ana Souza')).toBeInTheDocument();
    expect(searchInput).toHaveValue('');

    await act(() => router.navigate(1));

    await waitFor(() => expect(screen.queryByText('Ana Souza')).not.toBeInTheDocument());
    expect(searchInput).toHaveValue('bruno');
  });
});
