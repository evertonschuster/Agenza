import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { BottomNav } from './BottomNav';

describe('BottomNav', () => {
  it('shows the four primary destinations directly and marks the active one', () => {
    render(
      <MemoryRouter initialEntries={['/clientes']}>
        <BottomNav />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Início/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Clientes/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Mais' })).toBeInTheDocument();
  });

  it('reveals Conversas and Ajustes inside the "Mais" sheet, not as direct tabs', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <BottomNav />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('link', { name: /Conversas/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mais' }));

    expect(screen.getByRole('link', { name: /Conversas \(em breve\)/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ajustes \(em breve\)/ })).toBeInTheDocument();
  });

  it('closes the sheet after picking a destination from "Mais"', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <BottomNav />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Mais' }));
    await user.click(screen.getByRole('link', { name: /Conversas \(em breve\)/ }));

    expect(screen.queryByRole('link', { name: /Conversas/ })).not.toBeInTheDocument();
  });
});
