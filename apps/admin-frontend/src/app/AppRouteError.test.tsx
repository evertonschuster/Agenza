import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';
import { ApiProblemError } from '@/shared/api/unwrap';
import { AppRouteError } from './AppRouteError';

function Boom(): never {
  throw new Error('component exploded');
}

function ThrowApiProblem(): never {
  throw new ApiProblemError({
    status: 409,
    code: 'Category.DuplicateName',
    title: 'Esse nome já existe.',
  });
}

function renderTree(children: RouteObject[], initialPath: string) {
  const router = createMemoryRouter([{ errorElement: <AppRouteError />, children }], {
    initialEntries: [initialPath],
  });
  return render(<RouterProvider router={router} />);
}

describe('AppRouteError', () => {
  it('catches a render error from a sibling of /categories with the app screen, not the React Router default', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    renderTree(
      [
        { path: '/categories', element: <div>categorias</div> },
        { path: '/reports', element: <Boom /> },
      ],
      '/reports',
    );

    expect(screen.getByText('Algo deu errado.')).toBeInTheDocument();
    expect(screen.getByText('Recarregue a página.')).toBeInTheDocument();
    expect(screen.queryByText('Unexpected Application Error!')).not.toBeInTheDocument();
  });

  it('lets a route with its own errorElement win over the app-level one', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    renderTree(
      [{ path: '/categories', element: <Boom />, errorElement: <p>erro da fatia</p> }],
      '/categories',
    );

    expect(screen.getByText('erro da fatia')).toBeInTheDocument();
    expect(screen.queryByText('Recarregue a página.')).not.toBeInTheDocument();
  });

  it('shows an ApiProblemError title and code through FullScreenMessage', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    renderTree([{ path: '/categories', element: <ThrowApiProblem /> }], '/categories');

    expect(screen.getByText('Esse nome já existe.')).toBeInTheDocument();
    expect(screen.getByText('Category.DuplicateName')).toBeInTheDocument();
  });
});
