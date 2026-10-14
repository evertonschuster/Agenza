import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, MemoryRouter, RouterProvider, useLocation } from 'react-router';
import { ClientListPage } from './ClientListPage';
import type { ClientListQuery } from '../../../api/clientsRepository';
import type { ClientList, ClientListItem } from '../../../model/clientList';

const { mockList } = vi.hoisted(() => ({ mockList: vi.fn() }));

vi.mock('../../../api/clientsRepository', () => ({
  clientsRepository: { list: mockList },
}));

const SEARCH_LABEL = 'Buscar pessoas por nome, e-mail ou CPF';
const PAGE_SIZE_LABEL = 'Itens por página';

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

const FIRST_PAGE_OF_EVERYONE = { search: '', page: 1, pageSize: 20 };

function listOf(
  items: ClientListItem[],
  paging: Partial<ClientList> = {},
): { ok: true; data: ClientList } {
  return {
    ok: true,
    data: { items, totalCount: items.length, page: 1, pageSize: 20, ...paging },
  };
}

function people(count: number): ClientListItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `p${index + 1}`,
    fullName: `Pessoa ${String(index + 1).padStart(3, '0')}`,
    phone: null,
    email: null,
    cpf: null,
    status: 'active',
  }));
}

function serve(everyone: ClientListItem[]) {
  mockList.mockImplementation(({ search, page, pageSize }: ClientListQuery) => {
    const needle = search.toLowerCase();
    const matching = needle
      ? everyone.filter((client) => client.fullName.toLowerCase().includes(needle))
      : everyone;
    const start = (page - 1) * pageSize;
    return Promise.resolve(
      listOf(matching.slice(start, start + pageSize), {
        totalCount: matching.length,
        page,
        pageSize,
      }),
    );
  });
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
  serve(clients);
  return renderClientListPage(initialEntries);
}

function pending<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function location() {
  return screen.getByTestId('location').textContent;
}

describe('ClientListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the table loading skeleton on first render, before the initial fetch resolves', async () => {
    const initial = pending<ReturnType<typeof listOf>>();
    mockList.mockImplementationOnce(() => initial.promise);

    const { container } = renderClientListPage();

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByText('Nenhuma pessoa ainda')).not.toBeInTheDocument();

    initial.resolve(listOf(CLIENTS));

    await waitFor(() => expect(screen.getByText('Ana Souza')).toBeInTheDocument());
    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it('asks for the first page of 20 people, with no search, on the first load', async () => {
    renderPage(CLIENTS);
    await screen.findByText('Ana Souza');

    expect(mockList).toHaveBeenCalledTimes(1);
    expect(mockList).toHaveBeenCalledWith(FIRST_PAGE_OF_EVERYONE, expect.any(AbortSignal));
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
    expect(screen.queryByText('Nenhuma pessoa ainda')).not.toBeInTheDocument();
  });

  it('retries the same search from the failure, showing the skeleton while it reloads', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValueOnce({
      ok: false,
      error: { title: 'Sem conexão com o servidor. Tente novamente.' },
    });
    const retry = pending<ReturnType<typeof listOf>>();
    mockList.mockImplementationOnce(() => retry.promise);
    const { container } = renderClientListPage(['/pessoas?q=ana']);

    await user.click(await screen.findByRole('button', { name: 'Tentar novamente' }));

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(mockList).toHaveBeenLastCalledWith(
      { search: 'ana', page: 1, pageSize: 20 },
      expect.any(AbortSignal),
    );

    retry.resolve(listOf([ANA]));

    expect(await screen.findByText('Ana Souza')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('retries the same page and size from the failure, not the first page', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValueOnce({ ok: false, error: { title: 'Sem conexão.' } });
    mockList.mockResolvedValueOnce(listOf(people(10), { totalCount: 87, page: 3, pageSize: 10 }));
    renderClientListPage(['/pessoas?page=3&pageSize=10']);

    await user.click(await screen.findByRole('button', { name: 'Tentar novamente' }));

    await screen.findByText('Pessoa 001');
    expect(mockList).toHaveBeenLastCalledWith(
      { search: '', page: 3, pageSize: 10 },
      expect.any(AbortSignal),
    );
    expect(location()).toBe('location: /pessoas?page=3&pageSize=10');
  });

  it('says there is nobody yet, without a search action, when the list is empty and nothing was searched', async () => {
    renderPage([]);

    expect(await screen.findByText('Nenhuma pessoa ainda')).toBeInTheDocument();
    expect(screen.getByText('Use o botão Nova pessoa para cadastrar a primeira.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Limpar busca' })).not.toBeInTheDocument();
  });

  it('names the search term, and offers to clear it, when a search finds nobody', async () => {
    const user = userEvent.setup();
    renderPage(CLIENTS);
    await screen.findByText('Ana Souza');

    await user.type(screen.getByLabelText(SEARCH_LABEL), 'zzz{Enter}');

    expect(await screen.findByText('Nenhuma pessoa encontrada para «zzz»')).toBeInTheDocument();
    expect(screen.queryByText('Nenhuma pessoa ainda')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Limpar busca' })).toBeInTheDocument();
  });

  it('clears the search, the URL and the field, and lists everyone again, from "Limpar busca"', async () => {
    const user = userEvent.setup();
    renderPage(CLIENTS, ['/pessoas?q=zzz']);
    await user.click(await screen.findByRole('button', { name: 'Limpar busca' }));

    expect(await screen.findByText('Ana Souza')).toBeInTheDocument();
    expect(location()).toBe('location: /pessoas');
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
    expect(mockList).toHaveBeenLastCalledWith(
      { search: 'bruno', page: 1, pageSize: 20 },
      expect.any(AbortSignal),
    );
    expect(location()).toBe('location: /pessoas?q=bruno');
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
    await waitFor(() =>
      expect(mockList).toHaveBeenCalledWith(
        { search: 'bruno', page: 1, pageSize: 20 },
        expect.any(AbortSignal),
      ),
    );
    expect(await screen.findByText('Bruno Lima')).toBeInTheDocument();
    expect(screen.queryByText('Ana Souza')).not.toBeInTheDocument();
  });

  it('removes ?q= instead of leaving it empty when the search is submitted blank', async () => {
    const user = userEvent.setup();
    renderPage(CLIENTS, ['/pessoas?q=bruno']);
    await screen.findByText('Bruno Lima');

    await user.clear(screen.getByLabelText(SEARCH_LABEL));
    await user.keyboard('{Enter}');

    await waitFor(() => expect(location()).toBe('location: /pessoas'));
  });

  it('shows the loading skeleton while a new search is in flight, replacing the stale rows', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValueOnce(listOf(CLIENTS));
    const { container } = renderClientListPage();
    await screen.findByText('Ana Souza');

    const search = pending<ReturnType<typeof listOf>>();
    mockList.mockImplementationOnce(() => search.promise);

    await user.type(screen.getByLabelText(SEARCH_LABEL), 'bruno{Enter}');

    await waitFor(() => expect(container.querySelector('[aria-busy="true"]')).not.toBeNull());
    expect(screen.queryByText('Ana Souza')).not.toBeInTheDocument();
    expect(screen.queryByText('Nenhuma pessoa encontrada para «bruno»')).not.toBeInTheDocument();

    search.resolve(listOf([BRUNO]));

    await waitFor(() => expect(screen.getByText('Bruno Lima')).toBeInTheDocument());
    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it('keeps the newer search result even if the older, superseded request resolves later', async () => {
    const user = userEvent.setup();
    renderPage(CLIENTS);
    await screen.findByText('Ana Souza');

    const first = pending<ReturnType<typeof listOf>>();
    mockList.mockImplementationOnce(() => first.promise);
    const searchInput = screen.getByLabelText(SEARCH_LABEL);
    await user.type(searchInput, 'bruno{Enter}');
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));

    const second = pending<ReturnType<typeof listOf>>();
    mockList.mockImplementationOnce(() => second.promise);
    await user.clear(searchInput);
    await user.type(searchInput, 'ana{Enter}');
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(3));

    await act(async () => {
      second.resolve(listOf([ANA]));
      await Promise.resolve();
    });
    expect(screen.getByText('Ana Souza')).toBeInTheDocument();

    await act(async () => {
      first.resolve(listOf([BRUNO]));
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
    mockList.mockImplementation(({ search }: ClientListQuery) =>
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

  describe('paging', () => {
    it('asks for the page and the size in the URL', async () => {
      renderPage(people(87), ['/pessoas?page=3&pageSize=10']);

      expect(await screen.findByText('Pessoa 021')).toBeInTheDocument();
      expect(mockList).toHaveBeenCalledTimes(1);
      expect(mockList).toHaveBeenCalledWith(
        { search: '', page: 3, pageSize: 10 },
        expect.any(AbortSignal),
      );
    });

    it('says which people are on screen out of how many, below the table', async () => {
      renderPage(people(87));

      const status = await screen.findByRole('status');
      expect(status).toHaveTextContent('Exibindo 1–20 de 87 pessoas');
      expect(screen.getByText('Pessoa 020')).toBeInTheDocument();
      expect(screen.queryByText('Pessoa 021')).not.toBeInTheDocument();
      const table = screen.getByRole('table', { name: 'Pessoas' });
      expect(table.compareDocumentPosition(status)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('has no controls before the first answer, when the total is still unknown', async () => {
      const initial = pending<ReturnType<typeof listOf>>();
      mockList.mockImplementationOnce(() => initial.promise);
      renderClientListPage();

      expect(screen.queryByRole('navigation', { name: 'Paginação' })).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();

      initial.resolve(listOf(people(87).slice(0, 20), { totalCount: 87 }));

      expect(await screen.findByRole('navigation', { name: 'Paginação' })).toBeInTheDocument();
    });

    it('goes to the next page, keeping the search and the size, and puts the page in the URL', async () => {
      const user = userEvent.setup();
      renderPage(people(87), ['/pessoas?q=pessoa&pageSize=10']);
      await screen.findByText('Pessoa 001');

      await user.click(screen.getByRole('button', { name: 'Próxima' }));

      expect(await screen.findByText('Pessoa 011')).toBeInTheDocument();
      expect(screen.queryByText('Pessoa 001')).not.toBeInTheDocument();
      expect(mockList).toHaveBeenLastCalledWith(
        { search: 'pessoa', page: 2, pageSize: 10 },
        expect.any(AbortSignal),
      );
      expect(location()).toBe('location: /pessoas?q=pessoa&pageSize=10&page=2');
      expect(screen.getByRole('status')).toHaveTextContent('Exibindo 11–20 de 87 pessoas');
    });

    it('goes to the page of a number', async () => {
      const user = userEvent.setup();
      renderPage(people(87));
      await screen.findByText('Pessoa 001');

      await user.click(screen.getByRole('button', { name: 'Ir para a página 3' }));

      expect(await screen.findByText('Pessoa 041')).toBeInTheDocument();
      expect(location()).toBe('location: /pessoas?page=3');
    });

    it('leaves the URL without ?page= when it goes back to the first page', async () => {
      const user = userEvent.setup();
      renderPage(people(87), ['/pessoas?page=2']);
      await screen.findByText('Pessoa 021');

      await user.click(screen.getByRole('button', { name: 'Anterior' }));

      expect(await screen.findByText('Pessoa 001')).toBeInTheDocument();
      expect(location()).toBe('location: /pessoas');
    });

    it('keeps the controls over the skeleton, disabled and on the last known total, while the next page loads', async () => {
      const user = userEvent.setup();
      const everyone = people(87);
      mockList.mockResolvedValueOnce(listOf(everyone.slice(0, 20), { totalCount: 87 }));
      const { container } = renderClientListPage();
      await screen.findByText('Pessoa 001');

      const next = pending<ReturnType<typeof listOf>>();
      mockList.mockImplementationOnce(() => next.promise);
      await user.click(screen.getByRole('button', { name: 'Próxima' }));

      await waitFor(() => expect(container.querySelector('[aria-busy="true"]')).not.toBeNull());
      expect(screen.queryByText('Pessoa 001')).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Exibindo 21–40 de 87 pessoas');
      expect(screen.getByRole('button', { name: 'Próxima' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      expect(screen.getByRole('combobox', { name: PAGE_SIZE_LABEL })).toBeDisabled();

      next.resolve(listOf(everyone.slice(20, 40), { totalCount: 87, page: 2 }));

      expect(await screen.findByText('Pessoa 021')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Próxima' })).toHaveAttribute(
        'aria-disabled',
        'false',
      );
      expect(screen.getByRole('combobox', { name: PAGE_SIZE_LABEL })).toBeEnabled();
    });

    it('goes back to the first page when the size changes, keeping the search', async () => {
      const user = userEvent.setup();
      renderPage(people(87), ['/pessoas?q=pessoa&page=3']);
      await screen.findByText('Pessoa 041');

      await user.click(screen.getByRole('combobox', { name: PAGE_SIZE_LABEL }));
      await user.click(await screen.findByRole('option', { name: '50' }));

      expect(await screen.findByText('Pessoa 050')).toBeInTheDocument();
      expect(mockList).toHaveBeenLastCalledWith(
        { search: 'pessoa', page: 1, pageSize: 50 },
        expect.any(AbortSignal),
      );
      expect(location()).toBe('location: /pessoas?q=pessoa&pageSize=50');
      expect(screen.getByRole('status')).toHaveTextContent('Exibindo 1–50 de 87 pessoas');
    });

    it('goes back to the default size without leaving ?pageSize= behind', async () => {
      const user = userEvent.setup();
      renderPage(people(87), ['/pessoas?pageSize=50']);
      await screen.findByText('Pessoa 050');

      await user.click(screen.getByRole('combobox', { name: PAGE_SIZE_LABEL }));
      await user.click(await screen.findByRole('option', { name: '20' }));

      await screen.findByText('Pessoa 020');
      expect(location()).toBe('location: /pessoas');
    });

    it('starts over on the first page when a search is submitted, keeping the size', async () => {
      const user = userEvent.setup();
      renderPage(people(87), ['/pessoas?page=3&pageSize=10']);
      await screen.findByText('Pessoa 021');

      await user.type(screen.getByLabelText(SEARCH_LABEL), 'pessoa 0{Enter}');

      expect(await screen.findByText('Pessoa 001')).toBeInTheDocument();
      expect(mockList).toHaveBeenLastCalledWith(
        { search: 'pessoa 0', page: 1, pageSize: 10 },
        expect.any(AbortSignal),
      );
      expect(location()).toBe('location: /pessoas?pageSize=10&q=pessoa+0');
    });

    it('starts over on the first page when the search is cleared, keeping the size', async () => {
      const user = userEvent.setup();
      renderPage(people(87), ['/pessoas?q=zzz&page=2&pageSize=50']);
      await user.click(await screen.findByRole('button', { name: 'Limpar busca' }));

      expect(await screen.findByText('Pessoa 001')).toBeInTheDocument();
      expect(location()).toBe('location: /pessoas?pageSize=50');
    });

    it('has no controls when a search finds nobody', async () => {
      renderPage(people(87), ['/pessoas?q=zzz']);

      await screen.findByText('Nenhuma pessoa encontrada para «zzz»');
      expect(screen.queryByRole('navigation', { name: 'Paginação' })).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('has no controls when the list failed to load', async () => {
      mockList.mockResolvedValue({ ok: false, error: { title: 'Sem conexão.' } });
      renderClientListPage();

      await screen.findByRole('alert');
      expect(screen.queryByRole('navigation', { name: 'Paginação' })).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('follows Back and Forward through the pages', async () => {
      const user = userEvent.setup();
      serve(people(87));
      const router = createMemoryRouter([{ path: '/pessoas', element: <ClientListPage /> }], {
        initialEntries: ['/pessoas'],
      });
      render(<RouterProvider router={router} />);
      await screen.findByText('Pessoa 001');

      await user.click(screen.getByRole('button', { name: 'Próxima' }));
      await screen.findByText('Pessoa 021');

      await act(() => router.navigate(-1));
      expect(await screen.findByText('Pessoa 001')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Exibindo 1–20 de 87 pessoas');

      await act(() => router.navigate(1));
      expect(await screen.findByText('Pessoa 021')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Exibindo 21–40 de 87 pessoas');
    });

    describe('a page or size that cannot be shown', () => {
      it('rewrites an unreadable page and size out of the URL, keeping the rest, without asking twice', async () => {
        renderPage(people(87), ['/pessoas?q=pessoa&page=abc&pageSize=33']);

        expect(await screen.findByText('Pessoa 001')).toBeInTheDocument();
        await waitFor(() => expect(location()).toBe('location: /pessoas?q=pessoa'));
        expect(mockList).toHaveBeenCalledTimes(1);
        expect(mockList).toHaveBeenCalledWith(
          { search: 'pessoa', page: 1, pageSize: 20 },
          expect.any(AbortSignal),
        );
      });

      it.each(['0', '-1', '1.5', '99999999999999999999'])(
        'treats ?page=%s as the first page',
        async (page) => {
          renderPage(people(87), [`/pessoas?page=${page}`]);

          expect(await screen.findByText('Pessoa 001')).toBeInTheDocument();
          expect(mockList).toHaveBeenCalledWith(FIRST_PAGE_OF_EVERYONE, expect.any(AbortSignal));
          await waitFor(() => expect(location()).toBe('location: /pessoas'));
        },
      );

      it('sends the person to the last page that exists when the one asked for is past it', async () => {
        const everyone = people(87);
        renderPage(everyone, ['/pessoas?page=99']);

        expect(await screen.findByText('Pessoa 081')).toBeInTheDocument();
        expect(screen.getByText('Pessoa 087')).toBeInTheDocument();
        expect(location()).toBe('location: /pessoas?page=5');
        expect(mockList).toHaveBeenNthCalledWith(
          1,
          { search: '', page: 99, pageSize: 20 },
          expect.any(AbortSignal),
        );
        expect(mockList).toHaveBeenNthCalledWith(
          2,
          { search: '', page: 5, pageSize: 20 },
          expect.any(AbortSignal),
        );
        expect(screen.getByRole('status')).toHaveTextContent('Exibindo 81–87 de 87 pessoas');
      });

      it('shows the skeleton, not an empty list, while it moves to the last page that exists', async () => {
        const everyone = people(87);
        const lastPage = pending<ReturnType<typeof listOf>>();
        mockList.mockImplementationOnce(() =>
          Promise.resolve(listOf([], { totalCount: 87, page: 99 })),
        );
        mockList.mockImplementationOnce(() => lastPage.promise);
        const { container } = renderClientListPage(['/pessoas?page=99']);

        await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
        expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
        expect(screen.queryByText('Nenhuma pessoa ainda')).not.toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveTextContent('Exibindo 81–87 de 87 pessoas');
        expect(screen.getByRole('combobox', { name: PAGE_SIZE_LABEL })).toBeDisabled();

        lastPage.resolve(listOf(everyone.slice(80), { totalCount: 87, page: 5 }));

        expect(await screen.findByText('Pessoa 081')).toBeInTheDocument();
      });

      it('replaces the address, so Back does not return to the page that did not exist', async () => {
        serve(people(87));
        const router = createMemoryRouter(
          [
            { path: '/inicio', element: <div>Início</div> },
            { path: '/pessoas', element: <ClientListPage /> },
          ],
          { initialEntries: ['/inicio', '/pessoas?page=99'], initialIndex: 1 },
        );
        render(<RouterProvider router={router} />);
        await screen.findByText('Pessoa 081');

        await act(() => router.navigate(-1));

        expect(router.state.location.pathname).toBe('/inicio');
      });

      it('sends a page past the first to the first when nothing was found at all', async () => {
        renderPage(people(87), ['/pessoas?q=zzz&page=3']);

        expect(await screen.findByText('Nenhuma pessoa encontrada para «zzz»')).toBeInTheDocument();
        await waitFor(() => expect(location()).toBe('location: /pessoas?q=zzz'));
      });
    });
  });
});
