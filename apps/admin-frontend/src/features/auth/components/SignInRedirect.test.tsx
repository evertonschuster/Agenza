import { describe, expect, it, vi } from 'vitest';
import { StrictMode } from 'react';
import { render } from '@testing-library/react';
import { AuthContext, type AuthContextValue } from '../AuthContext';
import { INITIAL_SESSION } from '../types';
import { SignInRedirect } from './SignInRedirect';

function renderSignIn(login: () => Promise<void>) {
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
        <SignInRedirect />
      </AuthContext.Provider>
    </StrictMode>,
  );
}

describe('SignInRedirect', () => {
  it('calls login() exactly once per mount, even under StrictMode double-invoke', () => {
    const login = vi.fn().mockResolvedValue(undefined);

    renderSignIn(login);

    expect(login).toHaveBeenCalledTimes(1);
  });
});
