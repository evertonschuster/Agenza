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
});
