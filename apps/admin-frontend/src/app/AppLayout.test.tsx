import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthContext, type AuthContextValue } from '@/features/auth/AuthProvider';
import { INITIAL_SESSION } from '@/features/auth/types';
import { AppLayout } from './AppLayout';

function renderLayout() {
  const value: AuthContextValue = {
    session: { ...INITIAL_SESSION, status: 'authenticated', accessToken: 'token' },
    tenant: { tenantId: '019f9b0b-e7fb-7ac6-84b7-5c8ed52c6120' },
    user: { displayName: 'Demo Owner', email: 'owner@demo.local' },
    login: vi.fn(),
    logout: vi.fn(),
  };

  return render(
    <AuthContext.Provider value={value}>
      <AppLayout />
    </AuthContext.Provider>,
  );
}

describe('AppLayout', () => {
  it('renders the shell layout and placeholder navigation with no business-domain content (spec FR-004, FR-013)', () => {
    renderLayout();

    expect(screen.getByText('Agenza Admin')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();

    for (const forbidden of ['Categories', 'Services', 'Clients']) {
      expect(screen.queryByText(forbidden)).not.toBeInTheDocument();
    }
  });

  it('displays the authenticated tenant id (spec FR-004)', () => {
    renderLayout();

    expect(screen.getByTestId('tenant-id')).toHaveTextContent(
      '019f9b0b-e7fb-7ac6-84b7-5c8ed52c6120',
    );
  });
});
