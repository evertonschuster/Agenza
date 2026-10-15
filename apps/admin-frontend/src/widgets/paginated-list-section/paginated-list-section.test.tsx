import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaginatedListSection, type PaginatedListSectionPaging } from './index';

interface Item {
  id: string;
  name: string;
}

const ITEMS: Item[] = [
  { id: '1', name: 'Primeiro' },
  { id: '2', name: 'Segundo' },
];

const PAGINATION: PaginatedListSectionPaging = {
  page: 2,
  pageSize: 20,
  totalCount: 87,
  itemLabel: { singular: 'item', plural: 'itens' },
  onPageChange: vi.fn(),
  onPageSizeChange: vi.fn(),
};

interface RenderOptions {
  status?: 'ready' | 'loading' | 'error';
  items?: Item[];
  pagination?: PaginatedListSectionPaging;
  className?: string;
}

function renderPaginated({
  status = 'ready',
  items = ITEMS,
  pagination = PAGINATION,
  className,
}: RenderOptions = {}) {
  return render(
    <PaginatedListSection
      status={status}
      items={items}
      getKey={(item) => item.id}
      renderItem={(item) => item.name}
      pagination={pagination}
      aria-label="Itens"
      className={className}
    />,
  );
}

function busyRegion(container: HTMLElement) {
  return container.querySelector('[aria-busy="true"]');
}

describe('PaginatedListSection', () => {
  describe('the list', () => {
    it('renders the items it is given, the way a ListSection does', () => {
      renderPaginated();

      const list = screen.getByRole('list', { name: 'Itens' });
      expect(
        within(list)
          .getAllByRole('listitem')
          .map((item) => item.textContent),
      ).toEqual(['Primeiro', 'Segundo']);
    });

    it('hands the table mode, the empty copy and the failure to the list', async () => {
      const onRetry = vi.fn();
      const { rerender } = render(
        <PaginatedListSection
          status="ready"
          items={ITEMS}
          getKey={(item) => item.id}
          columns={[{ key: 'name', header: 'Nome', cell: (item) => item.name }]}
          pagination={PAGINATION}
          aria-label="Itens"
        />,
      );
      expect(screen.getByRole('table', { name: 'Itens' })).toBeInTheDocument();

      rerender(
        <PaginatedListSection
          status="ready"
          items={[]}
          getKey={(item: Item) => item.id}
          renderItem={(item: Item) => item.name}
          emptyCopy={{ title: 'Nada por aqui' }}
          pagination={{ ...PAGINATION, totalCount: 0 }}
          aria-label="Itens"
        />,
      );
      expect(screen.getByText('Nada por aqui')).toBeInTheDocument();

      rerender(
        <PaginatedListSection
          status="error"
          items={[]}
          getKey={(item: Item) => item.id}
          renderItem={(item: Item) => item.name}
          failure={{ message: 'Fora do ar', onRetry }}
          pagination={PAGINATION}
          aria-label="Itens"
        />,
      );
      await userEvent.setup().click(screen.getByRole('button', { name: 'Tentar novamente' }));
      expect(onRetry).toHaveBeenCalledOnce();
    });

    it('applies className to the box around the list and the footer', () => {
      const { container } = renderPaginated({ className: 'custom-box' });

      expect(container.firstChild).toHaveClass('custom-box');
      expect(container.firstChild).toContainElement(screen.getByRole('list', { name: 'Itens' }));
      expect(container.firstChild).toContainElement(
        screen.getByRole('navigation', { name: 'Paginação' }),
      );
    });
  });

  describe('the footer', () => {
    it('shows where the person is, below the items, once the page is ready', () => {
      renderPaginated();

      const list = screen.getByRole('list', { name: 'Itens' });
      const summary = screen.getByRole('status');
      expect(summary).toHaveTextContent('Exibindo 21–40 de 87 itens');
      expect(list.compareDocumentPosition(summary)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      expect(screen.getByRole('navigation', { name: 'Paginação' })).toBeInTheDocument();
    });

    it('hands the page and size changes to the list', async () => {
      const onPageChange = vi.fn();
      const onPageSizeChange = vi.fn();
      renderPaginated({ pagination: { ...PAGINATION, onPageChange, onPageSizeChange } });
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: 'Próxima' }));
      await user.click(screen.getByRole('combobox', { name: 'Itens por página' }));
      await user.click(await screen.findByRole('option', { name: '50' }));

      expect(onPageChange).toHaveBeenCalledExactlyOnceWith(3);
      expect(onPageSizeChange).toHaveBeenCalledExactlyOnceWith(50);
    });

    it('keeps the controls on screen, disabled, over the skeleton while the next page loads', async () => {
      const onPageChange = vi.fn();
      const { container } = renderPaginated({
        status: 'loading',
        items: [],
        pagination: { ...PAGINATION, onPageChange },
      });

      expect(busyRegion(container)).not.toBeNull();
      expect(screen.getByRole('status')).toHaveTextContent('Exibindo 21–40 de 87 itens');
      await userEvent.setup().click(screen.getByRole('button', { name: 'Próxima' }));
      expect(screen.getByRole('button', { name: 'Próxima' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      expect(screen.getByRole('combobox', { name: 'Itens por página' })).toBeDisabled();
      expect(onPageChange).not.toHaveBeenCalled();
    });

    it('enables the controls when the page is ready', () => {
      renderPaginated();

      expect(screen.getByRole('button', { name: 'Próxima' })).toHaveAttribute(
        'aria-disabled',
        'false',
      );
      expect(screen.getByRole('combobox', { name: 'Itens por página' })).toBeEnabled();
    });

    it('hides the controls when the list failed to load', () => {
      renderPaginated({ status: 'error', items: [] });

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.queryByRole('navigation', { name: 'Paginação' })).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('shows no controls when the list has no total to page through', () => {
      renderPaginated({ items: [], pagination: { ...PAGINATION, page: 1, totalCount: 0 } });

      expect(screen.getByText('Nenhum item encontrado.')).toBeInTheDocument();
      expect(screen.queryByRole('navigation', { name: 'Paginação' })).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('shows no controls while the total is still unknown', () => {
      renderPaginated({
        status: 'loading',
        items: [],
        pagination: { ...PAGINATION, page: 1, totalCount: null },
      });

      expect(screen.queryByRole('navigation', { name: 'Paginação' })).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.queryByRole('combobox', { name: 'Itens por página' })).not.toBeInTheDocument();
    });
  });

  describe('the skeleton', () => {
    it.each([10, 20, 50, 100])('has as many rows as the page size, %i', (pageSize) => {
      const { container } = renderPaginated({
        status: 'loading',
        items: [],
        pagination: { ...PAGINATION, page: 1, pageSize },
      });

      expect(busyRegion(container)?.children).toHaveLength(pageSize);
    });

    it('has as many rows as the page size in table mode too, as the table it stands for', () => {
      const { container } = render(
        <PaginatedListSection
          status="loading"
          items={[] as Item[]}
          getKey={(item) => item.id}
          columns={[{ key: 'name', header: 'Nome', cell: (item) => item.name }]}
          pagination={{ ...PAGINATION, page: 1, pageSize: 50 }}
          aria-label="Itens"
        />,
      );

      expect(busyRegion(container)?.querySelectorAll('tbody tr')).toHaveLength(50);
    });

    it('has them before the total is known, when there is no footer yet', () => {
      const { container } = renderPaginated({
        status: 'loading',
        items: [],
        pagination: { ...PAGINATION, page: 1, pageSize: 50, totalCount: null },
      });

      expect(busyRegion(container)?.children).toHaveLength(50);
    });
  });
});
