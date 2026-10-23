import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderRoutes } from '@/test/renderRoutes';
import { Home } from './Home';

describe('Home', () => {
  it('renders the title of its route and what will appear here', () => {
    renderRoutes([{ index: true, handle: { crumb: 'Início' }, element: <Home /> }], '/');

    expect(screen.getByRole('heading', { name: 'Início', level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/O resumo do seu dia/)).toBeInTheDocument();
  });
});
