import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AuthContext, type AuthContextValue } from '@/features/auth';
import { INITIAL_SESSION } from '@/shared/session/session';
import { shortcutRegistry } from '@/shared/keyboard/shortcuts';
import { expectNoA11yViolations } from '@/test/a11y';
import { CommandPalette } from './CommandPalette';

function registerHelpShortcut(): void {
  shortcutRegistry.register({
    id: 'shortcut-help',
    key: '?',
    description: 'Abrir a ajuda de atalhos',
    handler: () => {},
  });
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
        <CommandPalette />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('CommandPalette', () => {
  afterEach(() => {
    shortcutRegistry.reset();
  });

  it('opens on "/" and lists the navigation destinations', () => {
    renderPalette();

    fireEvent.keyDown(document, { key: '/' });

    expect(screen.getByRole('option', { name: 'Início' })).toBeInTheDocument();
  });

  it('shows the trailing keycap for a command with a registered shortcut', () => {
    registerHelpShortcut();
    renderPalette();

    fireEvent.keyDown(document, { key: '/' });

    const helpOption = screen.getByRole('option', { name: 'Abrir ajuda' });
    expect(helpOption.querySelector('[data-slot="kbd"]')).toHaveTextContent('?');
  });

  it('has no a11y violations while open', async () => {
    const { baseElement } = renderPalette();

    fireEvent.keyDown(document, { key: '/' });

    await expectNoA11yViolations(baseElement);
  });
});
