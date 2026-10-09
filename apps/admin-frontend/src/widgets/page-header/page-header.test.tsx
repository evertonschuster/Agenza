import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { PageHeader, type PageHeaderParent } from './index';

function renderHeader(parents: readonly PageHeaderParent[], title = 'Nova pessoa') {
  render(
    <MemoryRouter>
      <PageHeader parents={parents} title={title} />
    </MemoryRouter>,
  );
  return within(screen.getByRole('navigation', { name: 'Caminho de navegação' }));
}

describe('PageHeader', () => {
  it('links each parent to its place and marks the title as the current page', () => {
    const trail = renderHeader([{ label: 'Pessoas', to: '/pessoas' }]);

    expect(trail.getByRole('link', { name: 'Pessoas' })).toHaveAttribute('href', '/pessoas');
    expect(trail.getByRole('heading', { name: 'Nova pessoa', level: 1 })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(trail.queryByRole('link', { name: 'Nova pessoa' })).not.toBeInTheDocument();
  });

  it('keeps every level of a deeper trail reachable, in order', () => {
    const trail = renderHeader(
      [
        { label: 'Pessoas', to: '/pessoas' },
        { label: 'Maria Souza', to: '/pessoas/42' },
        { label: 'Responsáveis', to: '/pessoas/42/responsaveis' },
      ],
      'Novo responsável',
    );

    expect(trail.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '/pessoas',
      '/pessoas/42',
      '/pessoas/42/responsaveis',
    ]);
    expect(trail.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Pessoas',
      'Maria Souza',
      'Responsáveis',
      'Novo responsável',
    ]);
  });

  it('shows only the title when there is no parent', () => {
    const trail = renderHeader([], 'Início');

    expect(trail.queryByRole('link')).not.toBeInTheDocument();
    expect(trail.getByRole('heading', { name: 'Início', level: 1 })).toBeInTheDocument();
  });
});
