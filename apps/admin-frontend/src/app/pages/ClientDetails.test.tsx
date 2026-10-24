import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderRoutes } from '@/test/renderRoutes';
import { ClientDetails } from './ClientDetails';

describe('ClientDetails', () => {
  it('explains that the person details are coming, under Pessoas, instead of presenting a working screen', () => {
    renderRoutes(
      [
        {
          path: 'pessoas',
          handle: { crumb: 'Pessoas' },
          children: [
            { path: ':id', handle: { crumb: 'Detalhes da pessoa' }, element: <ClientDetails /> },
          ],
        },
      ],
      '/pessoas/42',
    );

    expect(screen.getByRole('heading', { name: 'Detalhes da pessoa' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar para Pessoas' })).toHaveAttribute(
      'href',
      '/pessoas',
    );
    expect(screen.getByText('Em breve')).toBeInTheDocument();
  });
});
