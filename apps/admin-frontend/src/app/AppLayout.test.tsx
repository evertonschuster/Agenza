import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AuthContext, type AuthContextValue, INITIAL_SESSION } from '@/features/auth';
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
      <MemoryRouter initialEntries={['/inner']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="inner" element={<div>routed content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('AppLayout', () => {
  it('renders the shell (header, nav, logout) and the routed page via Outlet', () => {
    renderLayout();

    expect(screen.getByText('Agenza Admin')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Categorias' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sair/i })).toBeInTheDocument();
    expect(screen.getByText('routed content')).toBeInTheDocument();
  });

  it('displays the authenticated tenant id (spec FR-004)', () => {
    renderLayout();

    expect(screen.getByTestId('tenant-id')).toHaveTextContent(
      '019f9b0b-e7fb-7ac6-84b7-5c8ed52c6120',
    );
  });
});
