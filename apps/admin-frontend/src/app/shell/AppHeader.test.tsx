import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthContext, type AuthContextValue } from '@/features/auth';
import { INITIAL_SESSION } from '@/shared/session/session';
import { AppHeader } from './AppHeader';

function renderHeader(logout = vi.fn()) {
  const value: AuthContextValue = {
    session: { ...INITIAL_SESSION, status: 'authenticated', accessToken: 'token' },
    tenant: { tenantId: '019f9b0b-e7fb-7ac6-84b7-5c8ed52c6120' },
    user: { displayName: 'Demo Owner', email: 'owner@demo.local' },
    login: vi.fn(),
    logout,
  };

  return render(
    <AuthContext.Provider value={value}>
      <AppHeader />
    </AuthContext.Provider>,
  );
}

describe('AppHeader', () => {
  it('shows the initials of the signed-in user on the account menu trigger', () => {
    renderHeader();

    expect(screen.getByText('DO')).toBeInTheDocument();
  });

  it('signs the user out from the account menu', () => {
    const logout = vi.fn();
    renderHeader(logout);

    fireEvent.click(screen.getByRole('button', { name: 'Menu da conta' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sair' }));

    expect(logout).toHaveBeenCalledTimes(1);
  });
});
