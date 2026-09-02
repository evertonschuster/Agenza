import { describe, expect, it, vi, beforeEach } from 'vitest';
import { makeOidcUser } from '@/test/oidcUser';
import { getAuthCredentials, sessionStore } from '@/shared/session/sessionStore';
import { startListening } from './sessionDriver';

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

vi.mock('../api/authClient', () => ({
  authClient: {
    getUser: mockGetUser,
    signinRedirect: vi.fn(),
    signoutRedirect: vi.fn(),
    events: mockEvents,
  },
}));

describe('getAuthCredentials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStore.reset();
  });

  it('returns nulls when there is no authenticated session', () => {
    expect(getAuthCredentials()).toEqual({ accessToken: null, tenantId: null });
  });

  it('reports the live access token and tenant once the session is authenticated', async () => {
    const user = makeOidcUser({ tenantId: 'tenant-abc' });
    mockGetUser.mockResolvedValue(user);

    const stopListening = startListening();

    await vi.waitFor(() =>
      expect(getAuthCredentials()).toEqual({
        accessToken: user.access_token,
        tenantId: 'tenant-abc',
      }),
    );

    stopListening();
  });
});

describe('startListening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStore.reset();
  });

  it('translates an expired stored user into an unauthenticated session (fail closed)', async () => {
    mockGetUser.mockResolvedValue(makeOidcUser({ expired: true, tenantId: 'tenant-abc' }));

    const stopListening = startListening();

    await vi.waitFor(() =>
      expect(sessionStore.getSnapshot().session.status).toBe('unauthenticated'),
    );

    stopListening();
  });
});
