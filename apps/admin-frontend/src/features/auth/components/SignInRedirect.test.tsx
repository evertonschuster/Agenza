import { describe, expect, it, vi } from 'vitest';
import { StrictMode } from 'react';
import { render } from '@testing-library/react';
import { AuthContext, type AuthContextValue } from '../AuthProvider';
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
    // Regression test: StrictMode intentionally mounts -> cleans up -> remounts every effect
    // once in development. Without a guard, this fired signinRedirect() twice, racing the PKCE
    // state/verifier it writes to storage before navigating.
    const login = vi.fn().mockResolvedValue(undefined);

    renderSignIn(login);

    expect(login).toHaveBeenCalledTimes(1);
  });
});
