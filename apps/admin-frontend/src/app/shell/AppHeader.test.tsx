import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthContext, type AuthContextValue } from '@/features/auth';
import { INITIAL_SESSION } from '@/shared/session/session';
import { AppHeader } from './AppHeader';

function renderHeader(logout = vi.fn(), onOpenSearch = vi.fn()) {
  const value: AuthContextValue = {
    session: { ...INITIAL_SESSION, status: 'authenticated', accessToken: 'token' },
    tenant: { tenantId: '019f9b0b-e7fb-7ac6-84b7-5c8ed52c6120' },
    user: { displayName: 'Demo Owner', email: 'owner@demo.local' },
    login: vi.fn(),
    logout,
  };

  return render(
    <AuthContext.Provider value={value}>
      <AppHeader onOpenSearch={onOpenSearch} />
    </AuthContext.Provider>,
  );
}

describe('AppHeader', () => {
  it('shows the app name, so the panel is identifiable regardless of viewport kind', () => {
    renderHeader();

    expect(screen.getByText('Agenza Admin')).toBeInTheDocument();
  });

  it('opens search directly when Buscar is clicked', () => {
    const onOpenSearch = vi.fn();
    renderHeader(vi.fn(), onOpenSearch);

    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(onOpenSearch).toHaveBeenCalledOnce();
  });

  it('shows the initials of the signed-in user on the account menu trigger', () => {
    renderHeader();

    expect(screen.getByText('DO')).toBeInTheDocument();
  });

  it('shows the tenant id in the account menu, proving the shell is scoped to it', () => {
    renderHeader();

    fireEvent.click(screen.getByRole('button', { name: 'Menu da conta' }));

    expect(screen.getByTestId('tenant-id')).toHaveTextContent(
      '019f9b0b-e7fb-7ac6-84b7-5c8ed52c6120',
    );
  });

  it('signs the user out from the account menu', () => {
    const logout = vi.fn();
    renderHeader(logout);

    fireEvent.click(screen.getByRole('button', { name: 'Menu da conta' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sair' }));

    expect(logout).toHaveBeenCalledTimes(1);
  });
});
