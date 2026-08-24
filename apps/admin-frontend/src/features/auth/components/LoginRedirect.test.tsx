import { describe, expect, it, vi, beforeEach } from 'vitest';
import { StrictMode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { LoginRedirect } from './LoginRedirect';

const { mockSigninCallback } = vi.hoisted(() => ({ mockSigninCallback: vi.fn() }));

vi.mock('../authClient', () => ({
  authClient: { signinCallback: mockSigninCallback },
}));

function renderCallback({ strict = false } = {}) {
  const tree = (
    <MemoryRouter initialEntries={['/callback']}>
      <Routes>
        <Route path="/callback" element={<LoginRedirect />} />
        <Route path="/" element={<div>Home</div>} />
        <Route path="/login" element={<div>Login Screen</div>} />
      </Routes>
    </MemoryRouter>
  );

  return render(strict ? <StrictMode>{tree}</StrictMode> : tree);
}

describe('LoginRedirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('navigates to / after signinCallback resolves (spec FR-003)', async () => {
    mockSigninCallback.mockResolvedValue(undefined);

    renderCallback();

    await waitFor(() => {
      expect(screen.getByText('Home')).toBeInTheDocument();
    });
  });

  it('takes the failure path (redirects to /login) when signinCallback rejects (spec FR-003)', async () => {
    mockSigninCallback.mockRejectedValue(new Error('invalid state'));

    renderCallback();

    await waitFor(() => {
      expect(screen.getByText('Login Screen')).toBeInTheDocument();
    });
  });

  it('calls signinCallback() exactly once per mount, even under StrictMode double-invoke', async () => {
    // Regression test: without a guard, StrictMode's dev-only double-invoke redeemed the
    // single-use authorization code twice, racing a success and a failure navigation.
    mockSigninCallback.mockResolvedValue(undefined);

    renderCallback({ strict: true });

    await waitFor(() => {
      expect(screen.getByText('Home')).toBeInTheDocument();
    });

    expect(mockSigninCallback).toHaveBeenCalledTimes(1);
  });
});
