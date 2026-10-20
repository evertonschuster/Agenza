import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { footerSkeleton } from '@/test/footerSkeleton';
import type { ListSectionColumn } from '@/widgets/list-section';
import { PaginatedListSection, type PaginatedListSectionPaging } from './index';

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

const ITEM_LABEL = { singular: 'item', plural: 'itens' };

const PAGINATION: PaginatedListSectionPaging = {
  page: 2,
  pageSize: 20,
  totalCount: 87,
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
      columns={NAME_COLUMN}
      pagination={pagination}
      itemLabel={ITEM_LABEL}
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
    it('renders the items it is given as the table of a ListSection', () => {
      renderPaginated();

      const table = screen.getByRole('table', { name: 'Itens' });
      expect(
        within(table)
          .getAllByRole('row')
          .slice(1)
          .map((row) => row.textContent),
      ).toEqual(['Primeiro', 'Segundo']);
    });

    it('hands the empty copy and the failure to the list', async () => {
      const onRetry = vi.fn();
      const { rerender } = render(
        <PaginatedListSection
          status="ready"
          items={[] as Item[]}
          getKey={(item) => item.id}
          columns={NAME_COLUMN}
          emptyCopy={{ title: 'Nada por aqui' }}
          pagination={{ ...PAGINATION, totalCount: 0 }}
          itemLabel={ITEM_LABEL}
          aria-label="Itens"
        />,
      );
      expect(screen.getByText('Nada por aqui')).toBeInTheDocument();

      rerender(
        <PaginatedListSection
          status="error"
          items={[] as Item[]}
          getKey={(item) => item.id}
          columns={NAME_COLUMN}
          failure={{ message: 'Fora do ar', onRetry }}
          pagination={PAGINATION}
          itemLabel={ITEM_LABEL}
          aria-label="Itens"
        />,
      );
      await userEvent.setup().click(screen.getByRole('button', { name: 'Tentar novamente' }));
      expect(onRetry).toHaveBeenCalledOnce();
    });

    it('applies className to the box around the list and the footer', () => {
      const { container } = renderPaginated({ className: 'custom-box' });

      expect(container.firstChild).toHaveClass('custom-box');
      expect(container.firstChild).toContainElement(screen.getByRole('table', { name: 'Itens' }));
      expect(container.firstChild).toContainElement(
        screen.getByRole('navigation', { name: 'Paginação' }),
      );
    });
  });

  describe('the footer', () => {
    it('shows where the person is, below the items, once the page is ready', () => {
      renderPaginated();

      const table = screen.getByRole('table', { name: 'Itens' });
      const summary = screen.getByRole('status');
      expect(summary).toHaveTextContent('Exibindo 21–40 de 87 itens');
      expect(table.compareDocumentPosition(summary)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
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

    it('keeps the controls on screen and usable, over the skeleton, while a page loads', async () => {
      const onPageChange = vi.fn();
      const onPageSizeChange = vi.fn();
      const { container } = renderPaginated({
        status: 'loading',
        items: [],
        pagination: { ...PAGINATION, onPageChange, onPageSizeChange },
      });
      const user = userEvent.setup();

      expect(busyRegion(container)).not.toBeNull();
      expect(screen.getByRole('status')).toHaveTextContent('Exibindo 21–40 de 87 itens');
      expect(screen.getByRole('button', { name: 'Próxima' })).toHaveAttribute(
        'aria-disabled',
        'false',
      );
      expect(screen.getByRole('combobox', { name: 'Itens por página' })).toBeEnabled();

      await user.click(screen.getByRole('button', { name: 'Próxima' }));
      await user.click(screen.getByRole('combobox', { name: 'Itens por página' }));
      await user.click(await screen.findByRole('option', { name: '50' }));

      expect(onPageChange).toHaveBeenCalledExactlyOnceWith(3);
      expect(onPageSizeChange).toHaveBeenCalledExactlyOnceWith(50);
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
      const { container } = renderPaginated({ status: 'error', items: [] });

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(footerSkeleton(container)).toBeNull();
      expect(screen.queryByRole('navigation', { name: 'Paginação' })).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('shows no controls when the list has no total to page through', () => {
      renderPaginated({ items: [], pagination: { ...PAGINATION, page: 1, totalCount: 0 } });

      expect(screen.getByText('Nenhum item encontrado.')).toBeInTheDocument();
      expect(screen.queryByRole('navigation', { name: 'Paginação' })).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('draws a skeleton of the footer, with no controls, while the total is still unknown', () => {
      const { container } = renderPaginated({
        status: 'loading',
        items: [],
        pagination: { ...PAGINATION, page: 1, totalCount: null },
      });

      expect(screen.queryByRole('navigation', { name: 'Paginação' })).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.queryByRole('combobox', { name: 'Itens por página' })).not.toBeInTheDocument();
      expect(footerSkeleton(container)).toHaveAttribute('aria-hidden', 'true');
    });

    it('draws the footer, not its skeleton, over a loading page whose total is known', () => {
      const { container } = renderPaginated({ status: 'loading', items: [] });

      expect(screen.getByRole('navigation', { name: 'Paginação' })).toBeInTheDocument();
      expect(footerSkeleton(container)).toBeNull();
    });

    it('draws nothing under a ready list that has no total', () => {
      const { container } = renderPaginated({ pagination: { ...PAGINATION, totalCount: null } });

      expect(screen.queryByRole('navigation', { name: 'Paginação' })).not.toBeInTheDocument();
      expect(footerSkeleton(container)).toBeNull();
    });
  });

  describe('the skeleton', () => {
    it.each([10, 20, 50, 100])('has as many rows as the page size, %i', (pageSize) => {
      const { container } = renderPaginated({
        status: 'loading',
        items: [],
        pagination: { ...PAGINATION, page: 1, pageSize },
      });

      expect(busyRegion(container)?.querySelectorAll('tbody tr')).toHaveLength(pageSize);
    });

    it('has them before the total is known, when there is no footer yet', () => {
      const { container } = renderPaginated({
        status: 'loading',
        items: [],
        pagination: { ...PAGINATION, page: 1, pageSize: 50, totalCount: null },
      });

      expect(busyRegion(container)?.querySelectorAll('tbody tr')).toHaveLength(50);
    });
  });
});
