import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthProvider } from '../AuthProvider';
import { useAuth } from './useAuth';

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

function makeAccessToken(claims: Record<string, unknown>): string {
  const base64url = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${base64url({ alg: 'none' })}.${base64url(claims)}.signature`;
}

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports unauthenticated status when no session exists', async () => {
    mockGetUser.mockResolvedValue(null);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.session.status).toBe('unauthenticated');
    });
    expect(result.current.session.failureReason).toBeNull();
  });

  it('surfaces identity_unreachable instead of hanging when identity-service is unreachable (G1)', async () => {
    mockGetUser.mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.session.status).toBe('unauthenticated');
      expect(result.current.session.failureReason).toBe('identity_unreachable');
    });
  });

  it('surfaces missing_tenant_claim and remains unauthenticated when the token lacks tenant_id (G2)', async () => {
    mockGetUser.mockResolvedValue({
      expired: false,
      access_token: makeAccessToken({ sub: 'user-1' }),
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      profile: { name: 'Demo Owner', email: 'owner@demo.local' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.session.status).toBe('unauthenticated');
      expect(result.current.session.failureReason).toBe('missing_tenant_claim');
    });
    expect(result.current.tenant).toBeNull();
  });

  it('clears the local session and invokes the identity-service end-session flow on logout (FR-008)', async () => {
    mockGetUser.mockResolvedValue(null);
    mockSignoutRedirect.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.session.status).toBe('unauthenticated'));

    await result.current.logout();

    expect(mockSignoutRedirect).toHaveBeenCalledTimes(1);
  });
});
