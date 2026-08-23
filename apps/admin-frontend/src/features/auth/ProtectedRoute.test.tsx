import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { AuthContext, type AuthContextValue } from './AuthProvider';
import { ProtectedRoute } from './ProtectedRoute';
import { INITIAL_SESSION, type Session } from './types';

function renderWithSession(status: Session['status']) {
  const value: AuthContextValue = {
    session: { ...INITIAL_SESSION, status },
    tenant: null,
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
  };

  return render(
    <MemoryRouter initialEntries={['/']}>
      <AuthContext.Provider value={value}>
        <Routes>
          <Route path="/login" element={<div>Login Screen</div>} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <div>Protected Shell</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it('redirects to /login when unauthenticated (spec FR-001, FR-002, FR-009)', () => {
    renderWithSession('unauthenticated');

    expect(screen.getByText('Login Screen')).toBeInTheDocument();
    expect(screen.queryByText('Protected Shell')).not.toBeInTheDocument();
  });

  it('renders the protected content when authenticated', () => {
    renderWithSession('authenticated');

    expect(screen.getByText('Protected Shell')).toBeInTheDocument();
  });
});
