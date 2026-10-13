import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ListSection } from './index';

interface Item {
  id: string;
  name: string;
}

const ITEMS: Item[] = [
  { id: '1', name: 'Primeiro' },
  { id: '2', name: 'Segundo' },
];

describe('ListSection', () => {
  it('renders skeleton rows and marks the region busy while loading', () => {
    const { container } = render(
      <ListSection
        status="loading"
        items={[] as Item[]}
        getKey={(item) => item.id}
        renderItem={(item) => item.name}
        skeletonRowCount={2}
        aria-label="Itens"
      />,
    );

    const busyRegion = container.querySelector('[aria-busy="true"]');
    expect(busyRegion).not.toBeNull();
    expect(busyRegion?.children).toHaveLength(2);
  });

  it('shows a generic error state when status is error', () => {
    render(
      <ListSection
        status="error"
        items={[] as Item[]}
        getKey={(item) => item.id}
        renderItem={(item) => item.name}
        aria-label="Itens"
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar.');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('shows a generic empty state when ready with zero items, in list mode', () => {
    render(
      <ListSection
        status="ready"
        items={[] as Item[]}
        getKey={(item) => item.id}
        renderItem={(item) => item.name}
        aria-label="Itens"
      />,
    );

    expect(screen.getByText('Nenhum item encontrado.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('shows a generic empty state when ready with zero items, in table mode', () => {
    render(
      <ListSection
        status="ready"
        items={[] as Item[]}
        getKey={(item) => item.id}
        columns={[{ key: 'name', header: 'Nome', cell: (item) => item.name }]}
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
          renderItem={(item) => item.name}
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
          renderItem={(item) => item.name}
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
      failure?: { message: string; code?: string; onRetry?: () => void } | null;
      status?: 'error' | 'loading' | 'ready';
      items?: Item[];
    }) {
      const { status = 'error', items = [] } = props;
      return render(
        <ListSection
          status={status}
          items={items}
          getKey={(item) => item.id}
          renderItem={(item) => item.name}
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
          renderItem={(item) => item.name}
          failure={FAILURE}
          aria-label="Itens"
        />,
      );
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  it('renders one listitem per item via renderItem in list mode', () => {
    render(
      <ListSection
        status="ready"
        items={ITEMS}
        getKey={(item) => item.id}
        renderItem={(item) => item.name}
        aria-label="Itens"
      />,
    );

    const list = screen.getByRole('list', { name: 'Itens' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Primeiro');
    expect(rows[1]).toHaveTextContent('Segundo');
  });

  it('renders a table with one column header per column, in order, in table mode', () => {
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
    expect(screen.getByRole('cell', { name: 'Primeiro' })).toBeInTheDocument();
  });

  it('labels the table with aria-label in table mode', () => {
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
        renderItem={(item) => item.name}
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
        renderItem={(item) => item.name}
        aria-label="Itens"
      />,
    );

    const busyRegion = container.querySelector('[aria-busy="true"]');
    expect(busyRegion?.children).toHaveLength(10);
  });
});
