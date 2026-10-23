import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RouteObject } from 'react-router';
import { renderRoutes } from '@/test/renderRoutes';
import { PageHeader, type PageHeaderProps } from './index';

function routes(props: PageHeaderProps = {}): RouteObject[] {
  return [
    {
      path: 'pessoas',
      handle: { crumb: 'Pessoas' },
      children: [
        { index: true, element: <PageHeader {...props} /> },
        { path: 'nova', handle: { crumb: 'Nova pessoa' }, element: <PageHeader {...props} /> },
        {
          path: ':id',
          handle: { crumb: 'Detalhes da pessoa' },
          children: [
            { index: true, element: <PageHeader {...props} /> },
            {
              path: 'responsaveis',
              handle: { crumb: 'Responsáveis' },
              element: <PageHeader {...props} />,
            },
          ],
        },
      ],
    },
    { path: 'sem-rotulo', element: <PageHeader {...props} /> },
    {
      path: 'etiquetas',
      handle: { crumb: 'Etiquetas' },
      element: <PageHeader {...props} />,
      children: [{ path: 'nova', element: <p>Diálogo</p> }],
    },
  ];
}

function trail() {
  return within(screen.getByRole('navigation', { name: 'Caminho de navegação' }));
}

describe('PageHeader', () => {
  it('takes the title from the route it is on and marks it as the current page', () => {
    renderRoutes(routes(), '/pessoas/nova');

    expect(trail().getByRole('heading', { name: 'Nova pessoa', level: 1 })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(trail().queryByRole('link', { name: 'Nova pessoa' })).not.toBeInTheDocument();
  });

  it('builds the trail from every matched route that has a crumb, each one linking to its place', () => {
    renderRoutes(routes(), '/pessoas/42/responsaveis');

    expect(
      trail()
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(['/pessoas', '/pessoas/42']);
    expect(
      trail()
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Pessoas', 'Detalhes da pessoa', 'Responsáveis']);
  });

  it('goes back to the level above, not through the history, from the arrow', async () => {
    const user = userEvent.setup();
    renderRoutes(routes(), '/pessoas/42/responsaveis');

    const back = screen.getByRole('link', { name: 'Voltar para Detalhes da pessoa' });
    expect(back.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    await user.click(back);

    expect(screen.getByTestId('location')).toHaveTextContent(/^\/pessoas\/42$/);
    expect(screen.getByRole('heading', { name: 'Detalhes da pessoa', level: 1 })).toBeVisible();
  });

  it('shows only the title, with no arrow, on a first-level page', () => {
    renderRoutes(routes(), '/pessoas');

    expect(screen.getByRole('heading', { name: 'Pessoas', level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('takes a crumb on a layout route with no path as the first level, so a list goes back home', async () => {
    const user = userEvent.setup();
    renderRoutes(
      [
        {
          handle: { crumb: 'Início' },
          children: [
            { index: true, element: <PageHeader /> },
            { path: 'pessoas', handle: { crumb: 'Pessoas' }, element: <PageHeader /> },
          ],
        },
      ],
      '/pessoas',
    );

    expect(trail().getByRole('link', { name: 'Início' })).toHaveAttribute('href', '/');
    await user.click(screen.getByRole('link', { name: 'Voltar para Início' }));

    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
    expect(screen.getByRole('heading', { name: 'Início', level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Voltar/ })).not.toBeInTheDocument();
  });

  it('keeps the trail of the page under a child route that has no crumb, such as a dialog', () => {
    renderRoutes(routes(), '/etiquetas/nova');

    expect(screen.getByRole('heading', { name: 'Etiquetas', level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Voltar/ })).not.toBeInTheDocument();
  });

  it('hides the parents on narrow screens, where the arrow already says where it goes', () => {
    renderRoutes(routes(), '/pessoas/nova');

    const parent = trail().getByRole('link', { name: 'Pessoas' }).closest('li');
    expect(parent).toHaveClass('hidden', 'md:inline-flex');
    expect(trail().getByRole('heading', { name: 'Nova pessoa' }).closest('li')).not.toHaveClass(
      'hidden',
    );
  });

  it('places the description under the title, the addon beside it and the actions at the end', () => {
    renderRoutes(
      routes({
        description: 'Quem você atende.',
        titleAddon: <span>Ativa</span>,
        actions: <button type="button">Nova pessoa</button>,
      }),
      '/pessoas',
    );

    expect(screen.getByText('Quem você atende.')).toBeInTheDocument();
    expect(screen.getByText('Ativa')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nova pessoa' })).toBeInTheDocument();
  });

  it('refuses to render on a route with no crumb, instead of showing a page without a title', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    renderRoutes(routes(), '/sem-rotulo');

    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.getAllByText(/needs a matched route with handle.crumb/).length).toBeGreaterThan(
      0,
    );
  });
});
