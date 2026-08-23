import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { LoginRedirect } from './LoginRedirect';

const { mockSigninCallback } = vi.hoisted(() => ({ mockSigninCallback: vi.fn() }));

vi.mock('../authClient', () => ({
  authClient: { signinCallback: mockSigninCallback },
}));

function renderCallback() {
  return render(
    <MemoryRouter initialEntries={['/callback']}>
      <Routes>
        <Route path="/callback" element={<LoginRedirect />} />
        <Route path="/" element={<div>Home</div>} />
        <Route path="/login" element={<div>Login Screen</div>} />
      </Routes>
    </MemoryRouter>,
  );
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
});
