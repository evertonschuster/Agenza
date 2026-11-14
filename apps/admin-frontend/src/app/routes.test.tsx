import { describe, expect, it } from 'vitest';
import { matchRoutes } from 'react-router';
import { router } from './routes';

describe('rotas de pessoas', () => {
  it('encaminha a rota de detalhes removida para Início', () => {
    const match = matchRoutes(router.routes, '/pessoas/123')?.at(-1);

    expect(match?.route.path).toBe('*');
    expect(match?.route.element).toMatchObject({ props: { to: '/', replace: true } });
  });

  it.each([
    ['/pessoas/123/editar', ':id/editar'],
    ['/pessoas/123/excluir', ':id/excluir'],
  ])('mantém %s na rota %s', (path, expectedRoute) => {
    const match = matchRoutes(router.routes, path)?.at(-1);

    expect(match?.route.path).toBe(expectedRoute);
    expect(match?.params.id).toBe('123');
  });
});
