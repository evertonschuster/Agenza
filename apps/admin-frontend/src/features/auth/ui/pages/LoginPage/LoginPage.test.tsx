import { describe, expect, it, vi } from 'vitest';
import { StrictMode } from 'react';
import { render } from '@testing-library/react';
import { AuthContext, type AuthContextValue } from '../../AuthContext';
import { INITIAL_SESSION } from '@/shared/session/session';
import { LoginPage } from './LoginPage';

function renderLoginPage(login: () => Promise<void>) {
  const value: AuthContextValue = {
    session: INITIAL_SESSION,
    tenant: null,
    user: null,
    login,
    logout: vi.fn(),
  };

  return render(
    <StrictMode>
      <AuthContext.Provider value={value}>
        <LoginPage />
      </AuthContext.Provider>
    </StrictMode>,
  );
}

describe('LoginPage', () => {
  it('calls login() exactly once per mount, even under StrictMode double-invoke', () => {
    const login = vi.fn().mockResolvedValue(undefined);

    renderLoginPage(login);

    expect(login).toHaveBeenCalledTimes(1);
  });
});
