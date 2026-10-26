import { describe, expect, it, vi, beforeEach } from 'vitest';
import { makeOidcUser } from '@/test/oidcUser';
import type { User } from 'oidc-client-ts';
import { sessionStore } from '@/shared/session/sessionStore';
import { themeStore } from '@/shared/theme/themeStore';
import { logger } from '@/shared/logger';
import { login, startListening } from './sessionDriver';

const { mockGetUser, mockSigninRedirect, mockRemoveUser, mockStopSilentRenew, mockEvents } =
  vi.hoisted(() => ({
    mockGetUser: vi.fn(),
    mockSigninRedirect: vi.fn(),
    mockRemoveUser: vi.fn().mockResolvedValue(undefined),
    mockStopSilentRenew: vi.fn(),
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
    removeUser: mockRemoveUser,
    stopSilentRenew: mockStopSilentRenew,
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

  it.each([{ tenantId: 'tenant-other' }, { tenantId: 'tenant-abc', subject: 'user-2' }])(
    'removes persisted credentials and blocks late events after identity changes: %j',
    async (changed) => {
      mockGetUser.mockResolvedValue(makeOidcUser({ tenantId: 'tenant-abc' }));
      const stop = startListening();
      await vi.waitFor(() =>
        expect(sessionStore.getSnapshot().session.status).toBe('authenticated'),
      );
      const loaded = mockEvents.addUserLoaded.mock.lastCall?.[0] as (user: User) => void;
      loaded(makeOidcUser(changed));
      expect(sessionStore.getSnapshot().session.failureReason).toBe('identity_changed');
      expect(mockStopSilentRenew).toHaveBeenCalledTimes(1);
      expect(mockRemoveUser).toHaveBeenCalledTimes(1);
      const unloaded = mockEvents.addUserUnloaded.mock.lastCall?.[0] as () => void;
      unloaded();
      loaded(makeOidcUser({ tenantId: 'tenant-abc' }));
      expect(sessionStore.getSnapshot().session.failureReason).toBe('identity_changed');
      await login();
      expect(mockSigninRedirect).toHaveBeenCalledWith({
        prompt: 'login',
        extraQueryParams: { theme: themeStore.getSnapshot().resolved },
      });
      stop();
    },
  );

  it('ignores a stored user that resolves after a newer user event', async () => {
    let finish!: (user: User) => void;
    mockGetUser.mockReturnValue(
      new Promise<User>((resolve) => {
        finish = resolve;
      }),
    );
    const stop = startListening();
    const loaded = mockEvents.addUserLoaded.mock.lastCall?.[0] as (user: User) => void;
    loaded(makeOidcUser({ tenantId: 'tenant-new' }));
    finish(makeOidcUser({ tenantId: 'tenant-old' }));
    await mockGetUser.mock.results[0]?.value;
    expect(sessionStore.getSnapshot().tenant?.tenantId).toBe('tenant-new');
    stop();
  });

  it('keeps the identity change blocked when local credential cleanup fails', async () => {
    mockGetUser.mockResolvedValue(makeOidcUser({ tenantId: 'tenant-abc' }));
    mockRemoveUser.mockRejectedValueOnce(new Error('storage unavailable'));
    const stop = startListening();
    await vi.waitFor(() => expect(sessionStore.getSnapshot().session.status).toBe('authenticated'));
    const loaded = mockEvents.addUserLoaded.mock.lastCall?.[0] as (user: User) => void;
    loaded(makeOidcUser({ tenantId: 'tenant-other' }));
    await vi.waitFor(() => expect(logger.warn).toHaveBeenCalledWith('auth.session_cleanup_failed'));
    expect(sessionStore.getSnapshot().session.failureReason).toBe('identity_changed');
    expect(sessionStore.getSnapshot().session.accessToken).toBeNull();
    stop();
  });

  it('waits for local cleanup before starting an explicit login', async () => {
    mockGetUser.mockResolvedValue(makeOidcUser({ tenantId: 'tenant-abc' }));
    let finish!: () => void;
    mockRemoveUser.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const stop = startListening();
    await vi.waitFor(() => expect(sessionStore.getSnapshot().session.status).toBe('authenticated'));
    const loaded = mockEvents.addUserLoaded.mock.lastCall?.[0] as (user: User) => void;
    loaded(makeOidcUser({ tenantId: 'tenant-other' }));
    const pendingLogin = login();
    expect(mockSigninRedirect).not.toHaveBeenCalled();
    loaded(makeOidcUser({ tenantId: 'tenant-other' }));
    expect(sessionStore.getSnapshot().session.status).toBe('authenticating');
    finish();
    await pendingLogin;
    expect(mockSigninRedirect).toHaveBeenCalledOnce();
    stop();
  });

  it('ignores the initial read after its listener is disposed', async () => {
    mockGetUser.mockResolvedValue(makeOidcUser({ tenantId: 'tenant-abc' }));
    startListening()();
    await mockGetUser.mock.results[0]?.value;
    expect(sessionStore.getSnapshot().session.status).toBe('checking');
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
