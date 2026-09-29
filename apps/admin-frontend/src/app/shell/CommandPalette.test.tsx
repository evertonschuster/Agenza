import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { AuthContext, type AuthContextValue } from '@/features/auth';
import { INITIAL_SESSION } from '@/shared/session/session';
import { CommandPalette } from './CommandPalette';

function PaletteHarness() {
  const [open, setOpen] = useState(true);
  return <CommandPalette open={open} onOpenChange={setOpen} />;
}

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

function renderPalette() {
  const value: AuthContextValue = {
    session: { ...INITIAL_SESSION, status: 'authenticated', accessToken: 'token' },
    tenant: { tenantId: '019f9b0b-e7fb-7ac6-84b7-5c8ed52c6120' },
    user: { displayName: 'Demo Owner', email: 'owner@demo.local' },
    login: vi.fn(),
    logout: vi.fn(),
  };

  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter>
        <PaletteHarness />
        <LocationProbe />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('CommandPalette', () => {
  it('lists the navigation destinations when opened by the shell', () => {
    renderPalette();

    expect(screen.getByRole('option', { name: 'Início' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Etiquetas' })).toBeInTheDocument();
  });

  it('navigates to Etiquetas when its option is clicked', () => {
    renderPalette();

    fireEvent.click(screen.getByRole('option', { name: 'Etiquetas' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/tags');
  });

  it('filters destinations when the person types in Buscar', async () => {
    const user = userEvent.setup();
    renderPalette();

    const search = screen.getByPlaceholderText('Buscar destinos e comandos...');
    await user.type(search, 'eti');

    expect(screen.getByRole('option', { name: 'Etiquetas' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Início' })).not.toBeInTheDocument();
  });

  it('keeps theme and account commands available by click', () => {
    renderPalette();

    expect(screen.getByRole('option', { name: 'Tema claro' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Sair' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Abrir ajuda' })).not.toBeInTheDocument();
  });
});
