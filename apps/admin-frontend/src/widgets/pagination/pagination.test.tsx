import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination, type PaginationProps } from './index';

const ITEM_LABEL = { singular: 'pessoa', plural: 'pessoas' };
const PAGE_SIZE_LABEL = 'Itens por página';

function renderPagination(props: Partial<PaginationProps> = {}) {
  const onPageChange = vi.fn();
  const onPageSizeChange = vi.fn();
  render(
    <Pagination
      page={5}
      pageSize={20}
      totalCount={440}
      itemLabel={ITEM_LABEL}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      {...props}
    />,
  );
  return { onPageChange, onPageSizeChange };
}

describe('Pagination', () => {
  it('renders nothing when there is nothing to page through', () => {
    const { container } = render(
      <Pagination
        page={1}
        pageSize={20}
        totalCount={0}
        itemLabel={ITEM_LABEL}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  describe('summary', () => {
    it('says which items are on screen out of how many, as a status', () => {
      renderPagination({ page: 2, pageSize: 20, totalCount: 87 });

      expect(screen.getByRole('status')).toHaveTextContent('Exibindo 21–40 de 87 pessoas');
    });

    it('stops at the total on the last, partial page', () => {
      renderPagination({ page: 5, pageSize: 20, totalCount: 87 });

      expect(screen.getByRole('status')).toHaveTextContent('Exibindo 81–87 de 87 pessoas');
    });

    it('names one item once, not as a range, and in the singular', () => {
      renderPagination({ page: 1, pageSize: 20, totalCount: 1 });

      expect(screen.getByRole('status')).toHaveTextContent('Exibindo 1 de 1 pessoa');
      expect(screen.getByRole('status')).not.toHaveTextContent('pessoas');
    });

    it('writes the numbers the Brazilian way', () => {
      renderPagination({ page: 1, pageSize: 20, totalCount: 1234 });

      expect(screen.getByRole('status')).toHaveTextContent('Exibindo 1–20 de 1.234 pessoas');
    });

    it('uses the noun the list gives', () => {
      renderPagination({
        page: 1,
        pageSize: 20,
        totalCount: 3,
        itemLabel: { singular: 'serviço', plural: 'serviços' },
      });

      expect(screen.getByRole('status')).toHaveTextContent('Exibindo 1–3 de 3 serviços');
    });
  });

  describe('pages', () => {
    it('lists the pages around the current one, between Anterior and Próxima', () => {
      renderPagination({ page: 5, pageSize: 20, totalCount: 440 });

      const nav = screen.getByRole('navigation', { name: 'Paginação' });
      const names = within(nav)
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label') ?? button.textContent);
      expect(names).toEqual([
        'Anterior',
        'Ir para a página 1',
        'Ir para a página 4',
        'Página 5',
        'Ir para a página 6',
        'Ir para a página 22',
        'Próxima',
      ]);
    });

    it('marks the current page as the current page and no other', () => {
      renderPagination({ page: 5 });

      expect(screen.getByRole('button', { name: 'Página 5' })).toHaveAttribute(
        'aria-current',
        'page',
      );
      expect(screen.getByRole('button', { name: 'Ir para a página 4' })).not.toHaveAttribute(
        'aria-current',
      );
    });

    it('hides the gaps from assistive tech', () => {
      renderPagination({ page: 5 });

      const gaps = screen.getAllByText('…');
      expect(gaps).toHaveLength(2);
      gaps.forEach((gap) => expect(gap).toHaveAttribute('aria-hidden', 'true'));
    });

    it('also says "Página 5 de 22", for the narrow screens that hide the numbers', () => {
      renderPagination({ page: 5, pageSize: 20, totalCount: 440 });

      expect(screen.getByText('Página 5 de 22')).toBeInTheDocument();
    });

    it('goes to the page of a number', async () => {
      const { onPageChange } = renderPagination({ page: 5 });

      await userEvent.setup().click(screen.getByRole('button', { name: 'Ir para a página 6' }));

      expect(onPageChange).toHaveBeenCalledExactlyOnceWith(6);
    });

    it('goes to the previous and to the next page', async () => {
      const user = userEvent.setup();
      const { onPageChange } = renderPagination({ page: 5 });

      await user.click(screen.getByRole('button', { name: 'Anterior' }));
      await user.click(screen.getByRole('button', { name: 'Próxima' }));

      expect(onPageChange).toHaveBeenNthCalledWith(1, 4);
      expect(onPageChange).toHaveBeenNthCalledWith(2, 6);
    });

    it('does nothing when the current page is pressed', async () => {
      const { onPageChange } = renderPagination({ page: 5 });

      await userEvent.setup().click(screen.getByRole('button', { name: 'Página 5' }));

      expect(onPageChange).not.toHaveBeenCalled();
    });

    it('cannot go back from the first page, but stays focusable', async () => {
      const { onPageChange } = renderPagination({ page: 1 });
      const previous = screen.getByRole('button', { name: 'Anterior' });

      await userEvent.setup().click(previous);

      expect(previous).toHaveAttribute('aria-disabled', 'true');
      expect(onPageChange).not.toHaveBeenCalled();
      previous.focus();
      expect(previous).toHaveFocus();
    });

    it('cannot go forward from the last page', async () => {
      const { onPageChange } = renderPagination({ page: 22, pageSize: 20, totalCount: 440 });
      const next = screen.getByRole('button', { name: 'Próxima' });

      await userEvent.setup().click(next);

      expect(next).toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByRole('button', { name: 'Anterior' })).toHaveAttribute(
        'aria-disabled',
        'false',
      );
      expect(onPageChange).not.toHaveBeenCalled();
    });

    it('keeps the pager when everything fits on one page, with that page marked and both arrows off', async () => {
      const { onPageChange } = renderPagination({ page: 1, pageSize: 20, totalCount: 15 });
      const nav = screen.getByRole('navigation', { name: 'Paginação' });
      const buttons = within(nav).getAllByRole('button');

      expect(
        buttons.map((button) => button.getAttribute('aria-label') ?? button.textContent),
      ).toEqual(['Anterior', 'Página 1', 'Próxima']);
      expect(within(nav).getByRole('button', { name: 'Página 1' })).toHaveAttribute(
        'aria-current',
        'page',
      );
      expect(within(nav).getByRole('button', { name: 'Anterior' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      expect(within(nav).getByRole('button', { name: 'Próxima' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      expect(screen.getByText('Página 1 de 1')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Exibindo 1–15 de 15 pessoas');

      await userEvent.setup().click(within(nav).getByRole('button', { name: 'Próxima' }));
      expect(onPageChange).not.toHaveBeenCalled();
    });

    it('keeps the pager for one item too', () => {
      renderPagination({ page: 1, pageSize: 10, totalCount: 1 });

      expect(screen.getByRole('navigation', { name: 'Paginação' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Página 1' })).toBeInTheDocument();
    });
  });

  it('lays the parts out as summary, pager and size, which puts the pager between the other two', () => {
    renderPagination();
    const summary = screen.getByRole('status');
    const pager = screen.getByRole('navigation', { name: 'Paginação' });
    const size = screen.getByRole('combobox', { name: PAGE_SIZE_LABEL });

    expect(summary.compareDocumentPosition(pager)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(pager.compareDocumentPosition(size)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  describe('items per page', () => {
    it('shows the current size under its label', () => {
      renderPagination({ pageSize: 50, totalCount: 440 });

      expect(screen.getByRole('combobox', { name: PAGE_SIZE_LABEL })).toHaveTextContent('50');
    });

    it('shows the short label to the eye and keeps the full name for assistive tech', () => {
      renderPagination();

      expect(screen.getByRole('combobox', { name: PAGE_SIZE_LABEL })).toBeInTheDocument();
      expect(screen.getByText('Por página')).toHaveAttribute('aria-hidden', 'true');
      expect(screen.getByText(PAGE_SIZE_LABEL)).not.toHaveAttribute('aria-hidden');
    });

    it('offers 10, 20, 50 and 100', async () => {
      renderPagination();

      await userEvent.setup().click(screen.getByRole('combobox', { name: PAGE_SIZE_LABEL }));

      const options = await screen.findAllByRole('option');
      expect(options.map((option) => option.textContent)).toEqual(['10', '20', '50', '100']);
    });

    it('asks for the size picked', async () => {
      const user = userEvent.setup();
      const { onPageSizeChange } = renderPagination({ pageSize: 20 });

      await user.click(screen.getByRole('combobox', { name: PAGE_SIZE_LABEL }));
      await user.click(await screen.findByRole('option', { name: '50' }));

      expect(onPageSizeChange).toHaveBeenCalledExactlyOnceWith(50);
    });

    it.each([1, 10, 11])(
      'is offered with %i people, even when one page shows everything',
      (totalCount) => {
        renderPagination({ page: 1, pageSize: 20, totalCount });

        expect(screen.getByRole('combobox', { name: PAGE_SIZE_LABEL })).toBeInTheDocument();
      },
    );
  });

  describe('disabled', () => {
    it('ignores every control, keeping the pager focusable', async () => {
      const user = userEvent.setup();
      const { onPageChange, onPageSizeChange } = renderPagination({ page: 5, disabled: true });

      await user.click(screen.getByRole('button', { name: 'Anterior' }));
      await user.click(screen.getByRole('button', { name: 'Próxima' }));
      await user.click(screen.getByRole('button', { name: 'Ir para a página 6' }));

      expect(onPageChange).not.toHaveBeenCalled();
      expect(onPageSizeChange).not.toHaveBeenCalled();
      within(screen.getByRole('navigation', { name: 'Paginação' }))
        .getAllByRole('button')
        .forEach((button) => expect(button).toHaveAttribute('aria-disabled', 'true'));
      expect(screen.getByRole('combobox', { name: PAGE_SIZE_LABEL })).toBeDisabled();
    });

    it('keeps showing where the person is', () => {
      renderPagination({ page: 5, pageSize: 20, totalCount: 440, disabled: true });

      expect(screen.getByRole('status')).toHaveTextContent('Exibindo 81–100 de 440 pessoas');
      expect(screen.getByRole('button', { name: 'Página 5' })).toBeInTheDocument();
    });
  });
});
