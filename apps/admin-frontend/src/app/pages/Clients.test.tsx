import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Clients } from './Clients';

describe('Clients', () => {
  it('renders the Pessoas title and a way to register a new person', () => {
    render(
      <MemoryRouter>
        <Clients />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Pessoas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nova pessoa' })).toHaveAttribute(
      'href',
      '/pessoas/nova',
    );
  });
});
