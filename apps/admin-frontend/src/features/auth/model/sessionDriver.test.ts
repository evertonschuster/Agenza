import { describe, expect, it, vi, beforeEach } from 'vitest';
import { makeOidcUser } from '@/test/oidcUser';
import { sessionStore } from '@/shared/session/sessionStore';
import { themeStore } from '@/shared/theme/themeStore';
import { login, startListening } from './sessionDriver';

const { mockGetUser, mockSigninRedirect, mockEvents } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockSigninRedirect: vi.fn(),
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
    signinRedirect: mockSigninRedirect,
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

describe('login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStore.reset();
    localStorage.clear();
    themeStore.reset();
  });

  it('sends the current resolved theme as an extension parameter (ADR 0020, 0040)', async () => {
    themeStore.setChoice('dark');
    mockSigninRedirect.mockResolvedValue(undefined);

    await login();

    expect(mockSigninRedirect).toHaveBeenCalledWith({ extraQueryParams: { theme: 'dark' } });
  });

  it('reads the theme at call time, not at module load', async () => {
    themeStore.setChoice('light');
    mockSigninRedirect.mockResolvedValue(undefined);

    await login();

    expect(mockSigninRedirect).toHaveBeenCalledWith({ extraQueryParams: { theme: 'light' } });
  });
});
