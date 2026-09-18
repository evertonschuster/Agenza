import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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
        toolbar={<div>Busca</div>}
        skeletonRowCount={2}
      />,
    );

    expect(screen.getByText('Busca')).toBeInTheDocument();
    const busyRegion = container.querySelector('[aria-busy="true"]');
    expect(busyRegion).not.toBeNull();
    expect(busyRegion?.children).toHaveLength(2);
  });

  it('delegates to ErrorState when status is error', () => {
    render(
      <ListSection
        status="error"
        items={[] as Item[]}
        getKey={(item) => item.id}
        renderItem={(item) => item.name}
        error={{ title: 'Não foi possível carregar' }}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('delegates to EmptyState when status is empty', () => {
    render(
      <ListSection
        status="empty"
        items={[] as Item[]}
        getKey={(item) => item.id}
        renderItem={(item) => item.name}
        empty={{ title: 'Nenhum item ainda' }}
      />,
    );

    expect(screen.getByText('Nenhum item ainda')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
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

  it('renders the toolbar regardless of status', () => {
    render(
      <ListSection
        status="error"
        items={[] as Item[]}
        getKey={(item) => item.id}
        renderItem={(item) => item.name}
        toolbar={<div>Busca</div>}
        error={{ title: 'Falhou' }}
      />,
    );

    expect(screen.getByText('Busca')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
