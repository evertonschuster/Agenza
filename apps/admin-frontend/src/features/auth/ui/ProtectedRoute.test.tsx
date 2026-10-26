import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { useSyncExternalStore } from 'react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router';
import { AuthContext, type AuthContextValue } from './AuthContext';
import { ProtectedRoute } from './ProtectedRoute';
import { INITIAL_SESSION, type Session } from '@/shared/session/session';
import { sessionStore } from '@/shared/session/sessionStore';
import { makePrincipal } from '@/test/oidcUser';

function renderWithSession(session: Partial<Session> & { status: Session['status'] }) {
  const login = vi.fn();
  const value: AuthContextValue = {
    session: { ...INITIAL_SESSION, ...session },
    tenant: null,
    user: null,
    login,
    logout: vi.fn(),
  };

  render(
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

  return { login };
}

describe('ProtectedRoute', () => {
  it('redirects to /login when unauthenticated with no failure reason (spec FR-001, FR-002, FR-009)', () => {
    renderWithSession({ status: 'unauthenticated' });

    expect(screen.getByText('Login Screen')).toBeInTheDocument();
    expect(screen.queryByText('Protected Shell')).not.toBeInTheDocument();
  });

  it('renders the protected content when authenticated', () => {
    renderWithSession({ status: 'authenticated' });

    expect(screen.getByText('Protected Shell')).toBeInTheDocument();
  });

  it('renders nothing while checking for a stored session, instead of redirecting prematurely', () => {
    renderWithSession({ status: 'checking' });

    expect(screen.queryByText('Login Screen')).not.toBeInTheDocument();
    expect(screen.queryByText('Protected Shell')).not.toBeInTheDocument();
  });

  it.each(['authenticating', 'loggingOut'] as const)('renders nothing while %s', (status) => {
    renderWithSession({ status });

    expect(screen.queryByText('Login Screen')).not.toBeInTheDocument();
    expect(screen.queryByText('Protected Shell')).not.toBeInTheDocument();
  });

  it('redirects to /login on a plain renewal failure (spec Edge Case: silent renewal fails -> sent back to login)', () => {
    renderWithSession({ status: 'unauthenticated', failureReason: 'renewal_failed' });

    expect(screen.getByText('Login Screen')).toBeInTheDocument();
  });

  it.each(['identity_unreachable', 'missing_tenant_claim'] as const)(
    'shows a failure state instead of redirecting when failureReason is %s (avoids a silent redirect loop)',
    (failureReason) => {
      renderWithSession({ status: 'unauthenticated', failureReason });

      expect(screen.queryByText('Login Screen')).not.toBeInTheDocument();
      expect(screen.getByText('Falha ao entrar.')).toBeInTheDocument();
    },
  );

  it('lets the visitor retry deliberately from the failure state', async () => {
    const user = userEvent.setup();
    const { login } = renderWithSession({
      status: 'unauthenticated',
      failureReason: 'identity_unreachable',
    });

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(login).toHaveBeenCalledTimes(1);
  });

  it('offers explicit login after identity changes', async () => {
    const { login } = renderWithSession({
      status: 'unauthenticated',
      failureReason: 'identity_changed',
    });
    expect(screen.getByText('Sua sessão mudou.')).toBeInTheDocument();
    expect(screen.getByText('Entre novamente para continuar.')).toBeInTheDocument();
    expect(screen.queryByText('Protected Shell')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Entrar novamente' }));
    expect(login).toHaveBeenCalledOnce();
  });

  it('preserves an unsaved form on normal renewal and removes it when the tenant changes', async () => {
    sessionStore.reset();
    const principal = makePrincipal({ tenantId: 'tenant-a' });
    sessionStore.dispatch({ type: 'USER_LOADED', principal });
    function LiveGuard() {
      const snapshot = useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot);
      return (
        <AuthContext.Provider value={{ ...snapshot, login: vi.fn(), logout: vi.fn() }}>
          <ProtectedRoute>
            <input aria-label="Nome da pessoa" defaultValue="Maria" />
          </ProtectedRoute>
        </AuthContext.Provider>
      );
    }
    render(
      <MemoryRouter>
        <LiveGuard />
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByRole('textbox'), ' Souza');
    act(() =>
      sessionStore.dispatch({ type: 'USER_LOADED', principal: { ...principal, expiresAt: 123 } }),
    );
    expect(screen.getByRole('textbox')).toHaveValue('Maria Souza');
    act(() =>
      sessionStore.dispatch({
        type: 'USER_LOADED',
        principal: makePrincipal({ tenantId: 'tenant-b' }),
      }),
    );
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('Sua sessão mudou.')).toBeInTheDocument();
    sessionStore.reset();
  });
});
