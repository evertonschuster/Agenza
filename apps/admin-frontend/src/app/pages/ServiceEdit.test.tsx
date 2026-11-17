import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { matchRoutes } from 'react-router';
import { EDIT_RECORD_ROUTE } from '@/shared/routes/editRecordPath';
import { SERVICES_PATH } from '@/shared/routes/servicePaths';
import { renderRoutes } from '@/test/renderRoutes';
import { router } from '../routes';
import { ServiceEdit } from './ServiceEdit';

describe('ServiceEdit', () => {
  it('keeps the existing services destination as the index route', () => {
    const matches = matchRoutes(router.routes, '/servicos');
    expect(matches?.at(-1)?.route.index).toBe(true);
  });

  it.each(['/servicos/42/editar', '/servicos/456%2F789/editar'])(
    'matches the registered service edit route for %s instead of the fallback',
    (path) => {
      const matches = matchRoutes(router.routes, path);
      expect(matches?.at(-1)?.route.path).toBe(EDIT_RECORD_ROUTE);
      expect(matches?.at(-1)?.route.handle).toEqual({ crumb: 'Editar serviço' });
    },
  );

  it('explains that service editing is not yet available', () => {
    renderRoutes(
      [
        {
          path: SERVICES_PATH,
          handle: { crumb: 'Serviços' },
          children: [
            {
              path: EDIT_RECORD_ROUTE,
              handle: { crumb: 'Editar serviço' },
              element: <ServiceEdit />,
            },
          ],
        },
      ],
      '/servicos/42/editar',
    );
    expect(screen.getByRole('heading', { name: 'Editar serviço' })).toBeInTheDocument();
    expect(screen.getByText('Em breve')).toBeInTheDocument();
    expect(screen.getByText('A edição de serviços ainda não está disponível.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar para Serviços' })).toHaveAttribute(
      'href',
      '/servicos',
    );
  });
});
