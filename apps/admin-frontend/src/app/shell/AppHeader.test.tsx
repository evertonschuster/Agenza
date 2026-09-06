import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { AuthContext, type AuthContextValue } from '@/features/auth';
import { INITIAL_SESSION } from '@/shared/session/session';
import { shortcutRegistry } from '@/shared/keyboard/shortcuts';
import { AppHeader } from './AppHeader';

function markKeyboardDevice(): void {
  act(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
  });
}

// AppHeader reads this shortcut's hint but doesn't register it — in the app it's registered by
// the sibling <CommandPalette>, absent here since AppHeader renders alone in this file.
function registerSearchShortcut(): void {
  shortcutRegistry.register({
    id: 'command-palette-slash',
    key: '/',
    description: 'Abrir a paleta de comandos',
    handler: () => {},
  });
}

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
  afterEach(() => {
    shortcutRegistry.reset();
  });

  it('shows the app name, so the panel is identifiable regardless of viewport kind', () => {
    renderHeader();

    expect(screen.getByText('Agenza Admin')).toBeInTheDocument();
  });

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

  it('advertises the search shortcut once a keyboard is detected', () => {
    registerSearchShortcut();
    renderHeader();
    markKeyboardDevice();

    expect(screen.getByRole('button', { name: 'Buscar' })).toHaveAttribute(
      'aria-keyshortcuts',
      '/',
    );
  });

  it('stops advertising the search shortcut once shortcuts are disabled (WCAG 2.1.4)', () => {
    registerSearchShortcut();
    renderHeader();
    markKeyboardDevice();

    act(() => {
      shortcutRegistry.setEnabled(false);
    });

    expect(screen.getByRole('button', { name: 'Buscar' })).not.toHaveAttribute('aria-keyshortcuts');
  });
});
