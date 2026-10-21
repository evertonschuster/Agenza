import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ListSection, type ListSectionColumn } from './index';

interface Item {
  id: string;
  name: string;
}

const ITEMS: Item[] = [
  { id: '1', name: 'Primeiro' },
  { id: '2', name: 'Segundo' },
];

const NAME_COLUMN: ListSectionColumn<Item>[] = [
  { key: 'name', header: 'Nome', cell: (item) => item.name },
];

describe('ListSection', () => {
  it('shows a generic error state when status is error', () => {
    render(
      <ListSection
        status="error"
        items={[] as Item[]}
        getKey={(item) => item.id}
        columns={NAME_COLUMN}
        aria-label="Itens"
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar.');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows a generic empty state when ready with zero items', () => {
    render(
      <ListSection
        status="ready"
        items={[] as Item[]}
        getKey={(item) => item.id}
        columns={NAME_COLUMN}
        aria-label="Itens"
      />,
    );

    expect(screen.getByText('Nenhum item encontrado.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  describe('empty copy and search', () => {
    const COPY = {
      title: 'Nenhum cadastro ainda',
      description: 'Use o botão Novo para cadastrar o primeiro.',
      searchTitle: (term: string) => `Nada encontrado para «${term}»`,
      searchDescription: 'Confira a grafia.',
    };

    function renderEmpty(props: {
      emptyCopy?: typeof COPY;
      search?: { term: string; onClear: () => void };
      status?: 'ready' | 'loading';
      items?: Item[];
    }) {
      const { status = 'ready', items = [] } = props;
      return render(
        <ListSection
          status={status}
          items={items}
          getKey={(item) => item.id}
          columns={NAME_COLUMN}
          emptyCopy={props.emptyCopy}
          search={props.search}
          aria-label="Itens"
        />,
      );
    }

    it('shows the title and description given for an empty list nobody searched', () => {
      renderEmpty({ emptyCopy: COPY, search: { term: '', onClear: vi.fn() } });

      expect(screen.getByText('Nenhum cadastro ainda')).toBeInTheDocument();
      expect(screen.getByText('Use o botão Novo para cadastrar o primeiro.')).toBeInTheDocument();
      expect(screen.queryByText('Nenhum item encontrado.')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Limpar busca' })).not.toBeInTheDocument();
    });

    it('names the searched term, with its description and a way to clear it, when a search finds nothing', () => {
      renderEmpty({ emptyCopy: COPY, search: { term: 'ana', onClear: vi.fn() } });

      expect(screen.getByText('Nada encontrado para «ana»')).toBeInTheDocument();
      expect(screen.getByText('Confira a grafia.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Limpar busca' })).toBeInTheDocument();
      expect(screen.queryByText('Nenhum cadastro ainda')).not.toBeInTheDocument();
    });

    it('calls onClear when "Limpar busca" is pressed', async () => {
      const onClear = vi.fn();
      renderEmpty({ emptyCopy: COPY, search: { term: 'ana', onClear } });

      await userEvent.setup().click(screen.getByRole('button', { name: 'Limpar busca' }));

      expect(onClear).toHaveBeenCalledTimes(1);
    });

    it('falls back to generic copy for a search that finds nothing when no copy is given', () => {
      renderEmpty({ search: { term: 'ana', onClear: vi.fn() } });

      expect(screen.getByText('Nenhum item encontrado para «ana»')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Limpar busca' })).toBeInTheDocument();
    });

    it('shows neither variant while there are items or before the list is ready', () => {
      const search = { term: 'ana', onClear: vi.fn() };
      const { rerender } = renderEmpty({ emptyCopy: COPY, search, items: ITEMS });
      expect(screen.queryByText('Nada encontrado para «ana»')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Limpar busca' })).not.toBeInTheDocument();

      rerender(
        <ListSection
          status="loading"
          items={[] as Item[]}
          getKey={(item) => item.id}
          columns={NAME_COLUMN}
          emptyCopy={COPY}
          search={search}
          aria-label="Itens"
        />,
      );
      expect(screen.queryByText('Nada encontrado para «ana»')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Limpar busca' })).not.toBeInTheDocument();
    });
  });

  describe('error title and failure', () => {
    const FAILURE = {
      message: 'O servidor está instável.',
      code: 'Server.Unavailable',
    };

    function renderError(props: {
      errorTitle?: string;
      failure?: {
        message: string;
        code?: string;
        onRetry?: () => void;
        retryInSeconds?: number;
      } | null;
      status?: 'error' | 'loading' | 'ready';
      items?: Item[];
    }) {
      const { status = 'error', items = [] } = props;
      return render(
        <ListSection
          status={status}
          items={items}
          getKey={(item) => item.id}
          columns={NAME_COLUMN}
          errorTitle={props.errorTitle}
          failure={props.failure}
          aria-label="Itens"
        />,
      );
    }

    it('shows the given title in place of the generic one', () => {
      renderError({ errorTitle: 'Não foi possível carregar as pessoas.' });

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Não foi possível carregar as pessoas.');
      expect(alert).not.toHaveTextContent('Não foi possível carregar.');
    });

    it('shows the failure message and code under the title', () => {
      renderError({ errorTitle: 'Não foi possível carregar as pessoas.', failure: FAILURE });

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('O servidor está instável.');
      expect(alert).toHaveTextContent('Código: Server.Unavailable');
    });

    it('offers "Tentar novamente" only when the failure has a retry, and calls it', async () => {
      const onRetry = vi.fn();
      const { unmount } = renderError({ failure: FAILURE });
      expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument();
      unmount();

      renderError({ failure: { ...FAILURE, onRetry } });
      await userEvent.setup().click(screen.getByRole('button', { name: 'Tentar novamente' }));

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('holds the retry and shows the seconds left while the failure asks to wait', () => {
      renderError({ failure: { ...FAILURE, onRetry: vi.fn(), retryInSeconds: 5 } });

      expect(screen.getByRole('button', { name: 'Tentar novamente em 5 s' })).toBeDisabled();
    });

    it('keeps the generic title with no details when no failure is given', () => {
      renderError({ failure: null });

      expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar.');
      expect(screen.queryByText(/Código:/)).not.toBeInTheDocument();
    });

    it('shows nothing of it while loading or when ready', () => {
      const { rerender } = renderError({ status: 'loading', failure: FAILURE });
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();

      rerender(
        <ListSection
          status="ready"
          items={ITEMS}
          getKey={(item) => item.id}
          columns={NAME_COLUMN}
          failure={FAILURE}
          aria-label="Itens"
        />,
      );
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  it('renders a table with one column header per column, in order, and one row per item', () => {
    render(
      <ListSection
        status="ready"
        items={ITEMS}
        getKey={(item) => item.id}
        columns={[
          { key: 'name', header: 'Nome', cell: (item) => item.name },
          { key: 'id', header: 'ID', align: 'end', cell: (item) => item.id },
        ]}
        aria-label="Itens"
      />,
    );

    const headers = screen.getAllByRole('columnheader');
    expect(headers.map((header) => header.textContent)).toEqual(['Nome', 'ID']);
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Primeiro');
    expect(rows[1]).toHaveTextContent('Segundo');
  });

  it('labels the table with aria-label', () => {
    render(
      <ListSection
        status="ready"
        items={ITEMS}
        getKey={(item) => item.id}
        columns={[{ key: 'name', header: 'Nome', cell: (item) => item.name }]}
        aria-label="Itens"
      />,
    );

    expect(screen.getByRole('table', { name: 'Itens' })).toBeInTheDocument();
  });

  it('right-aligns the header and cells for a column with align: "end", not the default column', () => {
    render(
      <ListSection
        status="ready"
        items={ITEMS}
        getKey={(item) => item.id}
        columns={[
          { key: 'name', header: 'Nome', cell: (item) => item.name },
          { key: 'id', header: 'ID', align: 'end', cell: (item) => item.id },
        ]}
        aria-label="Itens"
      />,
    );

    expect(screen.getByRole('columnheader', { name: 'Nome' })).not.toHaveClass('text-right');
    expect(screen.getByRole('columnheader', { name: 'ID' })).toHaveClass('text-right');
    expect(screen.getByRole('cell', { name: 'Primeiro' }).firstElementChild).not.toHaveClass(
      'justify-end',
    );
    expect(screen.getByRole('cell', { name: '1' }).firstElementChild).toHaveClass(
      'flex',
      'justify-end',
    );
  });

  it('right-aligns block-level cell content too, not only text (regression: an actions row stayed left under a right-aligned header)', () => {
    render(
      <ListSection
        status="ready"
        items={ITEMS}
        getKey={(item) => item.id}
        columns={[
          {
            key: 'actions',
            header: 'Ações',
            align: 'end',
            cell: (item) => (
              <div className="flex gap-1">
                <button type="button">{`Editar ${item.name}`}</button>
              </div>
            ),
          },
        ]}
        aria-label="Itens"
      />,
    );

    const actionsRow = screen.getByRole('button', { name: 'Editar Primeiro' }).parentElement;
    expect(actionsRow?.parentElement).toHaveClass('flex', 'justify-end');
  });

  it('applies the className prop to the wrapper element', () => {
    const { container } = render(
      <ListSection
        status="ready"
        items={ITEMS}
        getKey={(item) => item.id}
        columns={NAME_COLUMN}
        aria-label="Itens"
        className="custom-wrapper"
      />,
    );

    expect(container.firstChild).toHaveClass('custom-wrapper');
  });

  it('defaults to 10 skeleton rows when skeletonRowCount is omitted', () => {
    const { container } = render(
      <ListSection
        status="loading"
        items={[] as Item[]}
        getKey={(item) => item.id}
        columns={NAME_COLUMN}
        aria-label="Itens"
      />,
    );

    const busyRegion = container.querySelector('[aria-busy="true"]');
    expect(busyRegion?.querySelectorAll('tbody tr')).toHaveLength(10);
  });

  describe('skeleton', () => {
    const COLUMNS = [
      { key: 'name', header: 'Nome', cell: (item: Item) => item.name },
      {
        key: 'weight',
        header: 'Peso',
        align: 'end' as const,
        skeleton: <span data-testid="weight-skeleton" />,
        cell: (item: Item) => item.id,
      },
    ];

    function renderLoadingTable(rowCount: number) {
      return render(
        <ListSection
          status="loading"
          items={[] as Item[]}
          getKey={(item) => item.id}
          columns={COLUMNS}
          skeletonRowCount={rowCount}
          aria-label="Itens"
        />,
      );
    }

    it('imitates the table while loading: the real headers and one row per skeleton row', () => {
      const { container } = renderLoadingTable(3);

      const busyRegion = container.querySelector('[aria-busy="true"]');
      expect(busyRegion).not.toBeNull();
      expect(
        Array.from(busyRegion?.querySelectorAll('thead th') ?? []).map(
          (header) => header.textContent,
        ),
      ).toEqual(['Nome', 'Peso']);
      expect(busyRegion?.querySelectorAll('tbody tr')).toHaveLength(3);
    });

    it('shows the skeleton each column gives, and a generic bar where it gives none', () => {
      const { container } = renderLoadingTable(2);

      expect(screen.getAllByTestId('weight-skeleton')).toHaveLength(2);
      const nameCells = container.querySelectorAll('tbody tr td:first-child');
      expect(nameCells).toHaveLength(2);
      nameCells.forEach((cell) =>
        expect(cell.querySelector('[data-slot="skeleton"]')).not.toBeNull(),
      );
    });

    it('keeps a right-aligned column right-aligned', () => {
      const { container } = renderLoadingTable(1);

      expect(container.querySelectorAll('thead th')[1]).toHaveClass('text-right');
      expect(container.querySelector('tbody tr td:last-child > div')).toHaveClass('justify-end');
    });

    it('hides the placeholder table from assistive tech and from the pointer, keeping the busy region', () => {
      const { container } = renderLoadingTable(2);

      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      expect(container.querySelector('[aria-busy="true"][aria-live="polite"]')).not.toBeNull();
      expect(container.querySelector('[aria-hidden="true"]')).toHaveClass('pointer-events-none');
    });

    it('is the real table once the list is ready, with no placeholder left', () => {
      const { container } = render(
        <ListSection
          status="ready"
          items={ITEMS}
          getKey={(item) => item.id}
          columns={COLUMNS}
          aria-label="Itens"
        />,
      );

      expect(container.querySelector('[aria-busy="true"]')).toBeNull();
      expect(screen.getByRole('table', { name: 'Itens' })).toBeInTheDocument();
      expect(screen.queryByTestId('weight-skeleton')).not.toBeInTheDocument();
    });
  });
});
