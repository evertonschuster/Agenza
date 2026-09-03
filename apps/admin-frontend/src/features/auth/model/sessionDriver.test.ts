import { describe, expect, it, vi, beforeEach } from 'vitest';
import { makeOidcUser } from '@/test/oidcUser';
import { sessionStore } from '@/shared/session/sessionStore';
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

describe('startListening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStore.reset();
  });

  it('translates a live stored user into an authenticated principal', async () => {
    const user = makeOidcUser({ tenantId: 'tenant-abc' });
    mockGetUser.mockResolvedValue(user);

    const stopListening = startListening();

    await vi.waitFor(() => {
      const snapshot = sessionStore.getSnapshot();
      expect(snapshot.session.status).toBe('authenticated');
      expect(snapshot.session.accessToken).toBe(user.access_token);
      expect(snapshot.user).toEqual({ displayName: 'Demo Owner', email: 'owner@demo.local' });
      expect(snapshot.tenant).toEqual({ tenantId: 'tenant-abc' });
    });

    stopListening();
  });

  it('translates an expired stored user into an unauthenticated session (fail closed)', async () => {
    mockGetUser.mockResolvedValue(makeOidcUser({ expired: true, tenantId: 'tenant-abc' }));

    const stopListening = startListening();

    await vi.waitFor(() =>
      expect(sessionStore.getSnapshot().session.status).toBe('unauthenticated'),
    );

    stopListening();
  });

  it('ignores the initial getUser() result when a logout is already in flight (isLoggingOut guard)', async () => {
    sessionStore.dispatch({ type: 'LOGOUT_STARTED' });
    mockGetUser.mockResolvedValue(makeOidcUser({ tenantId: 'tenant-abc' }));

    const stopListening = startListening();
    await mockGetUser.mock.results[0]?.value;
    await Promise.resolve();

    expect(sessionStore.getSnapshot().session.status).toBe('loggingOut');

    stopListening();
  });
});
