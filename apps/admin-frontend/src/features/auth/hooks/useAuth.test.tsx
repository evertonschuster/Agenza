import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthProvider } from '../AuthProvider';
import { sessionStore } from '../sessionStore';
import { useAuth } from './useAuth';

// Exhaustive session-transition cases live in sessionStore.test.ts as pure `reduceSession`
// tests. This file only verifies the wiring: that oidc-client-ts events actually reach the
// store, and that `useSyncExternalStore` actually re-renders `useAuth`'s consumers.
const { mockGetUser, mockSigninRedirect, mockSignoutRedirect, mockEvents } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockSigninRedirect: vi.fn(),
  mockSignoutRedirect: vi.fn(),
  mockEvents: {
    addUserLoaded: vi.fn(),
    removeUserLoaded: vi.fn(),
    addSilentRenewError: vi.fn(),
    removeSilentRenewError: vi.fn(),
    addUserUnloaded: vi.fn(),
    removeUserUnloaded: vi.fn(),
  },
}));

vi.mock('../authClient', () => ({
  authClient: {
    getUser: mockGetUser,
    signinRedirect: mockSigninRedirect,
    signoutRedirect: mockSignoutRedirect,
    events: mockEvents,
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('useAuth (integration: AuthProvider + sessionStore wiring)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStore.reset();
  });

  it('reports checking (not unauthenticated) synchronously before the initial session check resolves', () => {
    // Regression test: ProtectedRoute must not treat this as "definitely logged out" and
    // redirect before getUser() has had a chance to find a valid stored session.
    mockGetUser.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.session.status).toBe('checking');
  });

  it('reports unauthenticated once the initial oidc-client-ts session check resolves with no user', async () => {
    mockGetUser.mockResolvedValue(null);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.session.status).toBe('unauthenticated');
    });
  });

  it('surfaces identity_unreachable when the initial session check rejects (G1)', async () => {
    mockGetUser.mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.session.failureReason).toBe('identity_unreachable');
    });
  });

  it('clears the local session and invokes the identity-service end-session flow on logout (spec FR-008)', async () => {
    mockGetUser.mockResolvedValue(null);
    mockSignoutRedirect.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.session.status).toBe('unauthenticated'));

    await act(() => result.current.logout());

    expect(mockSignoutRedirect).toHaveBeenCalledTimes(1);
  });
});
