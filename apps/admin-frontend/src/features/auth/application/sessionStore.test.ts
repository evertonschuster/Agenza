import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { User } from 'oidc-client-ts';
import { sessionStore, getAuthCredentials } from './sessionStore';

// Full transition coverage lives in domain/sessionMachine.test.ts and presentation/AuthProvider.test.tsx.
// This file only covers getAuthCredentials — the non-React reader the API client relies on.
const { mockGetUser, mockEvents } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockEvents: {
    addUserLoaded: vi.fn(),
    removeUserLoaded: vi.fn(),
    addSilentRenewError: vi.fn(),
    removeSilentRenewError: vi.fn(),
    addUserUnloaded: vi.fn(),
    removeUserUnloaded: vi.fn(),
  },
}));

vi.mock('../infrastructure/authClient', () => ({
  authClient: {
    getUser: mockGetUser,
    signinRedirect: vi.fn(),
    signoutRedirect: vi.fn(),
    events: mockEvents,
  },
}));

function makeAccessToken(claims: Record<string, unknown>): string {
  const base64url = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${base64url({ alg: 'none' })}.${base64url(claims)}.signature`;
}

function makeOidcUser(tenantId: string): User {
  return {
    access_token: makeAccessToken({ sub: 'user-1', tenant_id: tenantId }),
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expired: false,
    profile: { name: 'Demo Owner', email: 'owner@demo.local' },
  } as User;
}

describe('getAuthCredentials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStore.reset();
  });

  it('returns nulls when there is no authenticated session', () => {
    expect(getAuthCredentials()).toEqual({ accessToken: null, tenantId: null });
  });

  it('reports the live access token and tenant once the session is authenticated', async () => {
    const user = makeOidcUser('tenant-abc');
    mockGetUser.mockResolvedValue(user);

    const stopListening = sessionStore.startListening();

    await vi.waitFor(() =>
      expect(getAuthCredentials()).toEqual({
        accessToken: user.access_token,
        tenantId: 'tenant-abc',
      }),
    );

    stopListening();
  });
});
