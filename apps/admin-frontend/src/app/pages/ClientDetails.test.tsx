import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ClientDetails } from './ClientDetails';

describe('ClientDetails', () => {
  it('explains that the person details are coming, instead of presenting a working screen', () => {
    render(
      <MemoryRouter>
        <ClientDetails />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Detalhes da pessoa' })).toBeInTheDocument();
    expect(screen.getByText('Em breve')).toBeInTheDocument();
  });
});
