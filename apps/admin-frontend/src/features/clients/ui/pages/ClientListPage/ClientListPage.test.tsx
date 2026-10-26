import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router';
import { routerAt } from '@/test/renderRoutes';
import { footerSkeleton } from '@/test/footerSkeleton';
import { pending } from '@/test/pending';
import { ClientListPage } from './ClientListPage';
import { clientCreated, clientDeleted, clientUpdated } from '../../../model/clientEvents';
import type { ClientListQuery } from '../../../model/clientListFilters';
import type { ClientList, ClientListItem } from '../../../model/clientList';

const { mockList } = vi.hoisted(() => ({ mockList: vi.fn() }));

vi.mock('../../../api/clientsRepository', () => ({
  clientsRepository: { list: mockList },
}));

const SEARCH_LABEL = 'Buscar pessoas por nome, e-mail ou CPF';
const PAGE_SIZE_LABEL = 'Itens por página';
const STATUS_LABEL = 'Situação';

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

const FIRST_PAGE_OF_ACTIVE: ClientListQuery = {
  search: '',
  status: 'active',
  page: 1,
  pageSize: 20,
};

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
    routerAt(
      [
        {
          path: 'pessoas',
          handle: { crumb: 'Pessoas' },
          element: (
            <>
              <ClientListPage />
              <LocationProbe />
            </>
          ),
        },
      ],
      initialEntries,
    ),
  );
}

function renderPage(clients: ClientListItem[]) {
  serve(clients);
  return renderClientListPage();
}

function location() {
  return screen.getByTestId('location').textContent;
}

function skeletonRows(container: HTMLElement) {
  return container.querySelector('[aria-busy="true"]')?.querySelectorAll('tbody tr');
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

  it('asks for the first page of 20 active people, with no search, on the first load', async () => {
    renderPage(CLIENTS);
    await screen.findByText('Ana Souza');

    expect(mockList).toHaveBeenCalledTimes(1);
    expect(mockList).toHaveBeenCalledWith(FIRST_PAGE_OF_ACTIVE, expect.any(AbortSignal));
  });

  it('renders the Pessoas title and a "Nova pessoa" link pointing at the registration form', async () => {
    renderPage(CLIENTS);

    expect(await screen.findByRole('heading', { name: 'Pessoas' })).toBeInTheDocument();
    const newClient = screen.getByRole('link', { name: 'Nova pessoa' });
    expect(newClient).toHaveAttribute('href', '/pessoas/nova');
    expect(newClient.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('lists name, phone, e-mail, CPF, situation and actions under their own column headers', async () => {
    renderPage(CLIENTS);

    const table = await screen.findByRole('table', { name: 'Pessoas' });
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((header) => header.textContent);
    expect(headers).toEqual(['Nome', 'Telefone', 'E-mail', 'CPF', 'Situação', 'Ações']);

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

  it('links each name to the edit page of that person under /pessoas/:id/editar', async () => {
    renderPage(CLIENTS);

    expect(await screen.findByRole('link', { name: 'Ana Souza' })).toHaveAttribute(
      'href',
      '/pessoas/c1/editar',
    );
    expect(screen.getByRole('link', { name: 'Bruno Lima' })).toHaveAttribute(
      'href',
      '/pessoas/c2/editar',
    );
  });

  it('offers to edit each person, active or inactive, under /pessoas/:id/editar', async () => {
    renderPage(CLIENTS);

    const edit = await screen.findByRole('link', { name: 'Editar Ana Souza' });
    expect(edit).toHaveAttribute('href', '/pessoas/c1/editar');
    expect(edit.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('link', { name: 'Editar Bruno Lima' })).toHaveAttribute(
      'href',
      '/pessoas/c2/editar',
    );
  });

  it('offers to delete each person, active or inactive, under /pessoas/:id/excluir', async () => {
    renderPage(CLIENTS);

    const remove = await screen.findByRole('link', { name: 'Excluir Ana Souza' });
    expect(remove).toHaveAttribute('href', '/pessoas/c1/excluir');
    expect(remove.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('link', { name: 'Excluir Bruno Lima' })).toHaveAttribute(
      'href',
      '/pessoas/c2/excluir',
    );
  });

  it.each([
    ['a person is created', clientCreated],
    ['a person is updated', clientUpdated],
    ['a person is deleted', clientDeleted],
  ] as const)(
    'asks exactly once for the filters on screen when %s, keeping the rows until the answer',
    async (_event, topic) => {
      serve(CLIENTS);
      const { container } = renderClientListPage(['/pessoas?status=all']);
      await screen.findByText('Bruno Lima');
      const refetched = pending<ReturnType<typeof listOf>>();
      mockList.mockImplementationOnce(() => refetched.promise);

      act(() => {
        topic.publish({ id: 'c2' });
        expect(mockList).toHaveBeenCalledTimes(2);
        expect(mockList).toHaveBeenLastCalledWith(
          { ...FIRST_PAGE_OF_ACTIVE, status: 'all' },
          expect.any(AbortSignal),
        );
      });

      expect(screen.getByText('Bruno Lima')).toBeInTheDocument();
      expect(container.querySelector('[aria-busy="true"]')).toBeNull();

      await act(async () => {
        refetched.resolve(listOf([ANA]));
        await refetched.promise;
      });

      expect(screen.queryByText('Bruno Lima')).not.toBeInTheDocument();
      expect(screen.getByText('Ana Souza')).toBeInTheDocument();
      expect(mockList).toHaveBeenCalledTimes(2);
    },
  );

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
    mockList.mockResolvedValueOnce(listOf(CLIENTS));
    mockList.mockResolvedValueOnce({
      ok: false,
      error: { title: 'Sem conexão com o servidor. Tente novamente.' },
    });
    const retry = pending<ReturnType<typeof listOf>>();
    mockList.mockImplementationOnce(() => retry.promise);
    const { container } = renderClientListPage();
    await screen.findByText('Ana Souza');
    await user.type(screen.getByLabelText(SEARCH_LABEL), 'ana{Enter}');

    await user.click(await screen.findByRole('button', { name: 'Tentar novamente' }));

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(mockList).toHaveBeenLastCalledWith(
      { search: 'ana', status: 'active', page: 1, pageSize: 20 },
      expect.any(AbortSignal),
    );

    retry.resolve(listOf([ANA]));

    expect(await screen.findByText('Ana Souza')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('retries the same page and size from the failure, not the first page', async () => {
    const user = userEvent.setup();
    renderPage(people(87));
    await screen.findByText('Pessoa 001');
    await user.click(await screen.findByRole('combobox', { name: PAGE_SIZE_LABEL }));
    await user.click(await screen.findByRole('option', { name: '10' }));
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(11));

    mockList.mockResolvedValueOnce({ ok: false, error: { title: 'Sem conexão.' } });
    await user.click(screen.getByRole('button', { name: 'Ir para a página 3' }));
    await user.click(await screen.findByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Pessoa 021')).toBeInTheDocument();
    expect(mockList).toHaveBeenLastCalledWith(
      { search: '', status: 'active', page: 3, pageSize: 10 },
      expect.any(AbortSignal),
    );
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

  it('clears the search and the field, and lists everyone again, from "Limpar busca"', async () => {
    const user = userEvent.setup();
    renderPage(CLIENTS);
    await screen.findByText('Ana Souza');
    await user.type(screen.getByLabelText(SEARCH_LABEL), 'zzz{Enter}');

    await user.click(await screen.findByRole('button', { name: 'Limpar busca' }));

    expect(await screen.findByText('Ana Souza')).toBeInTheDocument();
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

  it('narrows the list to the submitted term, writing it into the address', async () => {
    const user = userEvent.setup();
    renderPage(CLIENTS);
    await screen.findByText('Ana Souza');

    await user.type(screen.getByLabelText(SEARCH_LABEL), 'bruno{Enter}');

    await waitFor(() => expect(screen.queryByText('Ana Souza')).not.toBeInTheDocument());
    expect(screen.getByText('Bruno Lima')).toBeInTheDocument();
    expect(mockList).toHaveBeenLastCalledWith(
      { search: 'bruno', status: 'active', page: 1, pageSize: 20 },
      expect.any(AbortSignal),
    );
    expect(location()).toBe('location: /pessoas?search=bruno');
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

  describe('the address', () => {
    it('opens on the search, the situation, the page and the size it carries, with the filters filled in', async () => {
      serve(people(87));
      renderClientListPage(['/pessoas?search=pessoa&status=all&page=2&pageSize=10']);

      expect(await screen.findByText('Pessoa 011')).toBeInTheDocument();
      expect(mockList).toHaveBeenCalledTimes(1);
      expect(mockList).toHaveBeenCalledWith(
        { search: 'pessoa', status: 'all', page: 2, pageSize: 10 },
        expect.any(AbortSignal),
      );
      expect(screen.getByLabelText(SEARCH_LABEL)).toHaveValue('pessoa');
      expect(screen.getByRole('combobox', { name: STATUS_LABEL })).toHaveTextContent(
        'Situação:Todas',
      );
      expect(screen.getByRole('status')).toHaveTextContent('Exibindo 11–20 de 87 pessoas');
    });

    it('uses the opening value of each filter the address does not carry', async () => {
      serve(people(87));
      renderClientListPage(['/pessoas?page=2']);

      expect(await screen.findByText('Pessoa 021')).toBeInTheDocument();
      expect(mockList).toHaveBeenCalledWith(
        { ...FIRST_PAGE_OF_ACTIVE, page: 2 },
        expect.any(AbortSignal),
      );
      expect(location()).toBe('location: /pessoas?page=2');
    });

    it('stays /pessoas while the list is on its opening filters, page and size', async () => {
      renderPage(CLIENTS);
      await screen.findByText('Ana Souza');

      expect(mockList).toHaveBeenCalledWith(FIRST_PAGE_OF_ACTIVE, expect.any(AbortSignal));
      expect(location()).toBe('location: /pessoas');
    });

    it('writes the last page that exists when the address asks for one past the end', async () => {
      serve(people(25));
      renderClientListPage(['/pessoas?page=9']);

      expect(await screen.findByText('Pessoa 021')).toBeInTheDocument();
      await waitFor(() => expect(location()).toBe('location: /pessoas?page=2'));
    });

    it('takes the filters back out of the address from "Limpar filtros", keeping the size', async () => {
      const user = userEvent.setup();
      serve(CLIENTS);
      renderClientListPage(['/pessoas?search=ana&status=all&pageSize=50']);
      await screen.findByText('Ana Souza');

      await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));

      expect(location()).toBe('location: /pessoas?pageSize=50');
    });

    it('keeps the address of the list out of the "Nova pessoa" link', async () => {
      serve(CLIENTS);
      renderClientListPage(['/pessoas?search=ana&status=all']);
      await screen.findByText('Ana Souza');

      expect(screen.getByRole('link', { name: 'Nova pessoa' })).toHaveAttribute(
        'href',
        '/pessoas/nova',
      );
    });

    it('keeps the address of the list out of the edit and delete links', async () => {
      serve(CLIENTS);
      renderClientListPage(['/pessoas?search=ana&status=all']);
      await screen.findByText('Ana Souza');

      expect(screen.getByRole('link', { name: 'Editar Ana Souza' })).toHaveAttribute(
        'href',
        '/pessoas/c1/editar',
      );
      expect(screen.getByRole('link', { name: 'Excluir Ana Souza' })).toHaveAttribute(
        'href',
        '/pessoas/c1/excluir',
      );
    });
  });

  it('lists everyone again when the search is submitted blank', async () => {
    const user = userEvent.setup();
    renderPage(CLIENTS);
    await screen.findByText('Ana Souza');
    await user.type(screen.getByLabelText(SEARCH_LABEL), 'bruno{Enter}');
    await waitFor(() => expect(screen.queryByText('Ana Souza')).not.toBeInTheDocument());

    await user.clear(screen.getByLabelText(SEARCH_LABEL));
    await user.keyboard('{Enter}');

    expect(await screen.findByText('Ana Souza')).toBeInTheDocument();
    expect(mockList).toHaveBeenLastCalledWith(FIRST_PAGE_OF_ACTIVE, expect.any(AbortSignal));
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

  describe('filters', () => {
    async function chooseSituation(user: ReturnType<typeof userEvent.setup>, label: string) {
      await user.click(screen.getByRole('combobox', { name: STATUS_LABEL }));
      await user.click(await screen.findByRole('option', { name: label }));
    }

    it('opens on the active people, saying so in the situation select', async () => {
      renderPage(CLIENTS);
      await screen.findByText('Ana Souza');

      expect(screen.getByRole('combobox', { name: STATUS_LABEL })).toHaveTextContent(
        'Situação:Ativas',
      );
    });

    it('offers the active, the inactive and every person, in that order', async () => {
      const user = userEvent.setup();
      renderPage(CLIENTS);
      await screen.findByText('Ana Souza');

      await user.click(screen.getByRole('combobox', { name: STATUS_LABEL }));

      const options = await screen.findAllByRole('option');
      expect(options.map((option) => option.textContent)).toEqual(['Ativas', 'Inativas', 'Todas']);
    });

    it('does not ask for anything when a situation is picked, only once Buscar is clicked', async () => {
      const user = userEvent.setup();
      renderPage(CLIENTS);
      await screen.findByText('Ana Souza');

      await chooseSituation(user, 'Inativas');

      expect(mockList).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('combobox', { name: STATUS_LABEL })).toHaveTextContent(
        'Situação:Inativas',
      );
    });

    it('applies the term and the situation together from Buscar, on the first page', async () => {
      const user = userEvent.setup();
      renderPage(people(45));
      await screen.findByText('Pessoa 001');
      await user.click(screen.getByRole('button', { name: 'Ir para a página 2' }));
      await screen.findByText('Pessoa 021');

      await user.type(screen.getByLabelText(SEARCH_LABEL), 'pessoa');
      await chooseSituation(user, 'Todas');
      await user.click(screen.getByRole('button', { name: 'Buscar' }));

      expect(mockList).toHaveBeenLastCalledWith(
        { search: 'pessoa', status: 'all', page: 1, pageSize: 20 },
        expect.any(AbortSignal),
      );
    });

    it('applies the chosen situation too when Enter is pressed in the search field', async () => {
      const user = userEvent.setup();
      renderPage(CLIENTS);
      await screen.findByText('Ana Souza');

      await chooseSituation(user, 'Inativas');
      await user.type(screen.getByLabelText(SEARCH_LABEL), 'bruno{Enter}');

      expect(mockList).toHaveBeenLastCalledWith(
        { search: 'bruno', status: 'inactive', page: 1, pageSize: 20 },
        expect.any(AbortSignal),
      );
    });

    it('highlights Buscar while a situation is picked but not applied yet', async () => {
      const user = userEvent.setup();
      renderPage(CLIENTS);
      await screen.findByText('Ana Souza');
      const search = screen.getByRole('button', { name: 'Buscar' });
      expect(search).toHaveAttribute('data-variant', 'outline');

      await chooseSituation(user, 'Inativas');
      expect(search).toHaveAttribute('data-variant', 'default');

      await user.click(search);
      await waitFor(() => expect(search).toHaveAttribute('data-variant', 'outline'));

      await chooseSituation(user, 'Ativas');
      await chooseSituation(user, 'Inativas');
      expect(search).toHaveAttribute('data-variant', 'outline');
    });

    it('offers "Limpar filtros" only once the applied filters differ from the opening ones', async () => {
      const user = userEvent.setup();
      renderPage(CLIENTS);
      await screen.findByText('Ana Souza');
      expect(screen.queryByRole('button', { name: 'Limpar filtros' })).not.toBeInTheDocument();

      await chooseSituation(user, 'Todas');
      expect(screen.queryByRole('button', { name: 'Limpar filtros' })).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Buscar' }));
      expect(await screen.findByRole('button', { name: 'Limpar filtros' })).toBeInTheDocument();
    });

    it('offers "Limpar filtros" after a search with the opening situation', async () => {
      const user = userEvent.setup();
      renderPage(CLIENTS);
      await screen.findByText('Ana Souza');

      await user.type(screen.getByLabelText(SEARCH_LABEL), 'ana{Enter}');

      expect(await screen.findByRole('button', { name: 'Limpar filtros' })).toBeInTheDocument();
    });

    it('goes back to the opening filters, field and select included, from "Limpar filtros", keeping the size', async () => {
      const user = userEvent.setup();
      renderPage(CLIENTS);
      await screen.findByText('Ana Souza');
      await user.click(await screen.findByRole('combobox', { name: PAGE_SIZE_LABEL }));
      await user.click(await screen.findByRole('option', { name: '50' }));
      await user.type(screen.getByLabelText(SEARCH_LABEL), 'ana');
      await chooseSituation(user, 'Todas');
      await user.click(screen.getByRole('button', { name: 'Buscar' }));

      await user.click(await screen.findByRole('button', { name: 'Limpar filtros' }));

      expect(mockList).toHaveBeenLastCalledWith(
        { search: '', status: 'active', page: 1, pageSize: 50 },
        expect.any(AbortSignal),
      );
      expect(screen.getByLabelText(SEARCH_LABEL)).toHaveValue('');
      expect(screen.getByRole('combobox', { name: STATUS_LABEL })).toHaveTextContent(
        'Situação:Ativas',
      );
      expect(screen.queryByRole('button', { name: 'Limpar filtros' })).not.toBeInTheDocument();
    });

    it('goes back to the opening filters from "Limpar busca", as "Limpar filtros" does', async () => {
      const user = userEvent.setup();
      renderPage(CLIENTS);
      await screen.findByText('Ana Souza');
      await chooseSituation(user, 'Inativas');
      await user.type(screen.getByLabelText(SEARCH_LABEL), 'zzz{Enter}');

      await user.click(await screen.findByRole('button', { name: 'Limpar busca' }));

      expect(mockList).toHaveBeenLastCalledWith(
        { search: '', status: 'active', page: 1, pageSize: 20 },
        expect.any(AbortSignal),
      );
      expect(screen.getByLabelText(SEARCH_LABEL)).toHaveValue('');
      expect(screen.getByRole('combobox', { name: STATUS_LABEL })).toHaveTextContent(
        'Situação:Ativas',
      );
    });

    it('keeps the applied situation when moving between pages', async () => {
      const user = userEvent.setup();
      renderPage(people(45));
      await screen.findByText('Pessoa 001');
      await chooseSituation(user, 'Todas');
      await user.click(screen.getByRole('button', { name: 'Buscar' }));
      await screen.findByText('Pessoa 001');

      await user.click(screen.getByRole('button', { name: 'Ir para a página 2' }));

      expect(mockList).toHaveBeenLastCalledWith(
        { search: '', status: 'all', page: 2, pageSize: 20 },
        expect.any(AbortSignal),
      );
    });
  });

  describe('paging', () => {
    it('says which people are on screen out of how many, below the table', async () => {
      renderPage(people(87));

      const status = await screen.findByRole('status');
      expect(status).toHaveTextContent('Exibindo 1–20 de 87 pessoas');
      expect(screen.getByText('Pessoa 020')).toBeInTheDocument();
      expect(screen.queryByText('Pessoa 021')).not.toBeInTheDocument();
      const table = screen.getByRole('table', { name: 'Pessoas' });
      expect(table.compareDocumentPosition(status)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('draws the footer as a skeleton, with no controls, before the first answer', async () => {
      const initial = pending<ReturnType<typeof listOf>>();
      mockList.mockImplementationOnce(() => initial.promise);
      const { container } = renderClientListPage();

      expect(footerSkeleton(container)).not.toBeNull();
      expect(screen.queryByRole('navigation', { name: 'Paginação' })).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();

      initial.resolve(listOf(people(87).slice(0, 20), { totalCount: 87 }));

      expect(await screen.findByRole('navigation', { name: 'Paginação' })).toBeInTheDocument();
      expect(footerSkeleton(container)).toBeNull();
    });

    it('draws the footer as a skeleton, not the total of the last search, while a new search loads', async () => {
      const user = userEvent.setup();
      const everyone = people(87);
      mockList.mockResolvedValueOnce(listOf(everyone.slice(0, 20), { totalCount: 87 }));
      const { container } = renderClientListPage();
      await screen.findByText('Pessoa 001');

      const search = pending<ReturnType<typeof listOf>>();
      mockList.mockImplementationOnce(() => search.promise);
      await user.type(screen.getByLabelText(SEARCH_LABEL), 'pessoa 00{Enter}');

      await waitFor(() => expect(footerSkeleton(container)).not.toBeNull());
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.queryByRole('navigation', { name: 'Paginação' })).not.toBeInTheDocument();

      search.resolve(listOf(everyone.slice(0, 9), { totalCount: 9 }));

      expect(await screen.findByRole('status')).toHaveTextContent('Exibindo 1–9 de 9 pessoas');
      expect(footerSkeleton(container)).toBeNull();
    });

    it('shows 20 skeleton rows, the default page size, on the first load', () => {
      mockList.mockImplementationOnce(() => pending<ReturnType<typeof listOf>>().promise);

      const { container } = renderClientListPage();

      expect(skeletonRows(container)).toHaveLength(20);
    });

    it('shows as many skeleton rows as the size just picked while that size loads', async () => {
      const user = userEvent.setup();
      mockList.mockResolvedValueOnce(listOf(people(87).slice(0, 20), { totalCount: 87 }));
      const { container } = renderClientListPage();
      await screen.findByText('Pessoa 001');

      mockList.mockImplementationOnce(() => pending<ReturnType<typeof listOf>>().promise);
      await user.click(await screen.findByRole('combobox', { name: PAGE_SIZE_LABEL }));
      await user.click(await screen.findByRole('option', { name: '50' }));

      await waitFor(() => expect(container.querySelector('[aria-busy="true"]')).not.toBeNull());
      expect(skeletonRows(container)).toHaveLength(50);
    });

    it('goes to the next page, keeping the search and the size, and writes all three into the address', async () => {
      const user = userEvent.setup();
      renderPage(people(87));
      await screen.findByText('Pessoa 001');
      await user.type(screen.getByLabelText(SEARCH_LABEL), 'pessoa{Enter}');
      await user.click(await screen.findByRole('combobox', { name: PAGE_SIZE_LABEL }));
      await user.click(await screen.findByRole('option', { name: '10' }));
      await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(11));

      await user.click(screen.getByRole('button', { name: 'Próxima' }));

      expect(await screen.findByText('Pessoa 011')).toBeInTheDocument();
      expect(screen.queryByText('Pessoa 001')).not.toBeInTheDocument();
      expect(mockList).toHaveBeenLastCalledWith(
        { search: 'pessoa', status: 'active', page: 2, pageSize: 10 },
        expect.any(AbortSignal),
      );
      expect(location()).toBe('location: /pessoas?search=pessoa&pageSize=10&page=2');
      expect(screen.getByRole('status')).toHaveTextContent('Exibindo 11–20 de 87 pessoas');
    });

    it('goes to the page of a number', async () => {
      const user = userEvent.setup();
      renderPage(people(87));
      await screen.findByText('Pessoa 001');

      await user.click(screen.getByRole('button', { name: 'Ir para a página 3' }));

      expect(await screen.findByText('Pessoa 041')).toBeInTheDocument();
    });

    it('goes back to the page before from Anterior', async () => {
      const user = userEvent.setup();
      renderPage(people(87));
      await screen.findByText('Pessoa 001');
      await user.click(screen.getByRole('button', { name: 'Próxima' }));
      await screen.findByText('Pessoa 021');

      await user.click(screen.getByRole('button', { name: 'Anterior' }));

      expect(await screen.findByText('Pessoa 001')).toBeInTheDocument();
      expect(mockList).toHaveBeenLastCalledWith(FIRST_PAGE_OF_ACTIVE, expect.any(AbortSignal));
    });

    it('keeps the controls over the skeleton, usable and on the last known total, while the next page loads', async () => {
      const user = userEvent.setup();
      const everyone = people(87);
      mockList.mockResolvedValueOnce(listOf(everyone.slice(0, 20), { totalCount: 87 }));
      const { container } = renderClientListPage();
      await screen.findByText('Pessoa 001');

      const next = pending<ReturnType<typeof listOf>>();
      mockList.mockImplementationOnce(() => next.promise);
      await user.click(screen.getByRole('button', { name: 'Próxima' }));

      await waitFor(() => expect(container.querySelector('[aria-busy="true"]')).not.toBeNull());
      expect(skeletonRows(container)).toHaveLength(20);
      expect(screen.queryByText('Pessoa 001')).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Exibindo 21–40 de 87 pessoas');
      expect(screen.getByRole('button', { name: 'Anterior' })).toHaveAttribute(
        'aria-disabled',
        'false',
      );
      expect(screen.getByRole('button', { name: 'Próxima' })).toHaveAttribute(
        'aria-disabled',
        'false',
      );
      expect(screen.getByRole('combobox', { name: PAGE_SIZE_LABEL })).toBeEnabled();

      next.resolve(listOf(everyone.slice(20, 40), { totalCount: 87, page: 2 }));

      expect(await screen.findByText('Pessoa 021')).toBeInTheDocument();
    });

    it('moves on to another page while one is still loading, and drops the answer that was in flight', async () => {
      const user = userEvent.setup();
      const everyone = people(87);
      mockList.mockResolvedValueOnce(listOf(everyone.slice(0, 20), { totalCount: 87 }));
      renderClientListPage();
      await screen.findByText('Pessoa 001');

      const second = pending<ReturnType<typeof listOf>>();
      let secondSignal: AbortSignal | undefined;
      mockList.mockImplementationOnce((_request: ClientListQuery, signal: AbortSignal) => {
        secondSignal = signal;
        return second.promise;
      });
      await user.click(screen.getByRole('button', { name: 'Próxima' }));
      await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));

      mockList.mockResolvedValueOnce(listOf(everyone.slice(40, 60), { totalCount: 87, page: 3 }));
      await user.click(screen.getByRole('button', { name: 'Próxima' }));

      expect(await screen.findByText('Pessoa 041')).toBeInTheDocument();
      expect(mockList).toHaveBeenLastCalledWith(
        { search: '', status: 'active', page: 3, pageSize: 20 },
        expect.any(AbortSignal),
      );
      expect(secondSignal?.aborted).toBe(true);

      await act(async () => {
        second.resolve(listOf(everyone.slice(20, 40), { totalCount: 87, page: 2 }));
        await second.promise;
      });

      expect(screen.getByText('Pessoa 041')).toBeInTheDocument();
      expect(screen.queryByText('Pessoa 021')).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Exibindo 41–60 de 87 pessoas');
    });

    it('changes the size while a page is still loading, and drops that page', async () => {
      const user = userEvent.setup();
      const everyone = people(87);
      mockList.mockResolvedValueOnce(listOf(everyone.slice(0, 20), { totalCount: 87 }));
      renderClientListPage();
      await screen.findByText('Pessoa 001');

      const second = pending<ReturnType<typeof listOf>>();
      let secondSignal: AbortSignal | undefined;
      mockList.mockImplementationOnce((_request: ClientListQuery, signal: AbortSignal) => {
        secondSignal = signal;
        return second.promise;
      });
      await user.click(screen.getByRole('button', { name: 'Próxima' }));
      await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));

      mockList.mockResolvedValueOnce(
        listOf(everyone.slice(0, 50), { totalCount: 87, page: 1, pageSize: 50 }),
      );
      await user.click(await screen.findByRole('combobox', { name: PAGE_SIZE_LABEL }));
      await user.click(await screen.findByRole('option', { name: '50' }));

      expect(await screen.findByText('Pessoa 050')).toBeInTheDocument();
      expect(mockList).toHaveBeenLastCalledWith(
        { search: '', status: 'active', page: 1, pageSize: 50 },
        expect.any(AbortSignal),
      );
      expect(secondSignal?.aborted).toBe(true);

      await act(async () => {
        second.resolve(listOf(everyone.slice(20, 40), { totalCount: 87, page: 2 }));
        await second.promise;
      });

      expect(screen.getAllByRole('row')).toHaveLength(51);
      expect(screen.getByRole('status')).toHaveTextContent('Exibindo 1–50 de 87 pessoas');
    });

    it('shows the skeleton again, not the rows it had, when it comes back to the page it was on while others load', async () => {
      const user = userEvent.setup();
      const everyone = people(87);
      mockList.mockResolvedValueOnce(listOf(everyone.slice(0, 20), { totalCount: 87 }));
      const { container } = renderClientListPage();
      await screen.findByText('Pessoa 001');

      const backOnFirst = pending<ReturnType<typeof listOf>>();
      mockList.mockImplementationOnce(() => new Promise<never>(() => {}));
      mockList.mockImplementationOnce(() => new Promise<never>(() => {}));
      mockList.mockImplementationOnce(() => backOnFirst.promise);
      await user.click(screen.getByRole('button', { name: 'Ir para a página 2' }));
      await user.click(screen.getByRole('button', { name: 'Ir para a página 3' }));
      await user.click(screen.getByRole('button', { name: 'Ir para a página 1' }));

      await waitFor(() => expect(mockList).toHaveBeenCalledTimes(4));
      expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
      expect(screen.queryByText('Pessoa 001')).not.toBeInTheDocument();

      backOnFirst.resolve(listOf(everyone.slice(0, 20), { totalCount: 87 }));

      expect(await screen.findByText('Pessoa 001')).toBeInTheDocument();
      expect(container.querySelector('[aria-busy="true"]')).toBeNull();
    });

    it('shows the skeleton again when a search comes back to the one on screen while another loads', async () => {
      const user = userEvent.setup();
      mockList.mockResolvedValueOnce(listOf(CLIENTS));
      const { container } = renderClientListPage();
      await screen.findByText('Ana Souza');

      const backOnAll = pending<ReturnType<typeof listOf>>();
      mockList.mockImplementationOnce(() => new Promise<never>(() => {}));
      mockList.mockImplementationOnce(() => backOnAll.promise);
      await user.type(screen.getByLabelText(SEARCH_LABEL), 'bruno{Enter}');
      await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
      await user.clear(screen.getByLabelText(SEARCH_LABEL));
      await user.keyboard('{Enter}');

      await waitFor(() => expect(mockList).toHaveBeenCalledTimes(3));
      expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
      expect(screen.queryByText('Ana Souza')).not.toBeInTheDocument();

      backOnAll.resolve(listOf(CLIENTS));

      expect(await screen.findByText('Ana Souza')).toBeInTheDocument();
    });

    it('goes back to the first page when the size changes, keeping the search', async () => {
      const user = userEvent.setup();
      renderPage(people(87));
      await screen.findByText('Pessoa 001');
      await user.type(screen.getByLabelText(SEARCH_LABEL), 'pessoa{Enter}');
      await user.click(await screen.findByRole('button', { name: 'Ir para a página 3' }));
      await screen.findByText('Pessoa 041');

      await user.click(await screen.findByRole('combobox', { name: PAGE_SIZE_LABEL }));
      await user.click(await screen.findByRole('option', { name: '50' }));

      expect(await screen.findByText('Pessoa 050')).toBeInTheDocument();
      expect(mockList).toHaveBeenLastCalledWith(
        { search: 'pessoa', status: 'active', page: 1, pageSize: 50 },
        expect.any(AbortSignal),
      );
      expect(screen.getByRole('status')).toHaveTextContent('Exibindo 1–50 de 87 pessoas');
    });

    it('starts over on the first page when a search is submitted, keeping the size', async () => {
      const user = userEvent.setup();
      renderPage(people(87));
      await screen.findByText('Pessoa 001');
      await user.click(await screen.findByRole('combobox', { name: PAGE_SIZE_LABEL }));
      await user.click(await screen.findByRole('option', { name: '10' }));
      await user.click(await screen.findByRole('button', { name: 'Ir para a página 3' }));
      await screen.findByText('Pessoa 021');

      await user.type(screen.getByLabelText(SEARCH_LABEL), 'pessoa 0{Enter}');

      expect(await screen.findByText('Pessoa 001')).toBeInTheDocument();
      expect(mockList).toHaveBeenLastCalledWith(
        { search: 'pessoa 0', status: 'active', page: 1, pageSize: 10 },
        expect.any(AbortSignal),
      );
    });

    it('keeps the size when the search is cleared', async () => {
      const user = userEvent.setup();
      renderPage(people(87));
      await screen.findByText('Pessoa 001');
      await user.click(await screen.findByRole('combobox', { name: PAGE_SIZE_LABEL }));
      await user.click(await screen.findByRole('option', { name: '50' }));
      await screen.findByText('Pessoa 050');
      await user.type(screen.getByLabelText(SEARCH_LABEL), 'zzz{Enter}');

      await user.click(await screen.findByRole('button', { name: 'Limpar busca' }));

      expect(await screen.findByText('Pessoa 050')).toBeInTheDocument();
      expect(mockList).toHaveBeenLastCalledWith(
        { search: '', status: 'active', page: 1, pageSize: 50 },
        expect.any(AbortSignal),
      );
    });

    it('has no controls when a search finds nobody', async () => {
      const user = userEvent.setup();
      renderPage(people(87));
      await screen.findByText('Pessoa 001');

      await user.type(screen.getByLabelText(SEARCH_LABEL), 'zzz{Enter}');

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

    describe('a page that no longer exists', () => {
      it('moves to the last page that exists when the total shrinks under the page on screen', async () => {
        const user = userEvent.setup();
        const remaining = people(25);
        mockList.mockResolvedValueOnce(listOf(people(87).slice(0, 20), { totalCount: 87 }));
        mockList.mockResolvedValueOnce(listOf([], { totalCount: 25, page: 5 }));
        mockList.mockResolvedValueOnce(listOf(remaining.slice(20), { totalCount: 25, page: 2 }));
        renderClientListPage();
        await screen.findByText('Pessoa 001');

        await user.click(screen.getByRole('button', { name: 'Ir para a página 5' }));

        expect(await screen.findByText('Pessoa 021')).toBeInTheDocument();
        expect(mockList).toHaveBeenNthCalledWith(
          2,
          { search: '', status: 'active', page: 5, pageSize: 20 },
          expect.any(AbortSignal),
        );
        expect(mockList).toHaveBeenNthCalledWith(
          3,
          { search: '', status: 'active', page: 2, pageSize: 20 },
          expect.any(AbortSignal),
        );
        expect(screen.getByRole('status')).toHaveTextContent('Exibindo 21–25 de 25 pessoas');
      });

      it('shows the skeleton, not an empty list, while it moves to the last page that exists', async () => {
        const user = userEvent.setup();
        const lastPage = pending<ReturnType<typeof listOf>>();
        mockList.mockResolvedValueOnce(listOf(people(87).slice(0, 20), { totalCount: 87 }));
        mockList.mockResolvedValueOnce(listOf([], { totalCount: 25, page: 5 }));
        mockList.mockImplementationOnce(() => lastPage.promise);
        const { container } = renderClientListPage();
        await screen.findByText('Pessoa 001');

        await user.click(screen.getByRole('button', { name: 'Ir para a página 5' }));

        await waitFor(() => expect(mockList).toHaveBeenCalledTimes(3));
        expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
        expect(screen.queryByText('Nenhuma pessoa ainda')).not.toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveTextContent('Exibindo 21–25 de 25 pessoas');
        expect(screen.getByRole('combobox', { name: PAGE_SIZE_LABEL })).toBeEnabled();

        lastPage.resolve(listOf(people(25).slice(20), { totalCount: 25, page: 2 }));

        expect(await screen.findByText('Pessoa 021')).toBeInTheDocument();
      });

      it('goes to the first page, and says there is nobody, when everyone is gone', async () => {
        const user = userEvent.setup();
        mockList.mockResolvedValueOnce(listOf(people(87).slice(0, 20), { totalCount: 87 }));
        mockList.mockResolvedValueOnce(listOf([], { totalCount: 0, page: 3 }));
        mockList.mockResolvedValueOnce(listOf([], { totalCount: 0 }));
        renderClientListPage();
        await screen.findByText('Pessoa 001');

        await user.click(screen.getByRole('button', { name: 'Ir para a página 3' }));

        expect(await screen.findByText('Nenhuma pessoa ainda')).toBeInTheDocument();
        expect(mockList).toHaveBeenLastCalledWith(FIRST_PAGE_OF_ACTIVE, expect.any(AbortSignal));
      });
    });
  });
});
