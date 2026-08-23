import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { User } from 'oidc-client-ts';
import { AuthProvider } from './AuthProvider';
import { sessionStore } from './sessionStore';
import { useAuth } from './hooks/useAuth';

// Exhaustive session-transition cases (including the G3 tenant-change-on-renewal case) live
// in sessionStore.test.ts as pure `reduceSession` tests. This file only verifies that a real
// `addUserLoaded`/`addSilentRenewError` event from `oidc-client-ts` actually reaches the
// store and re-renders `useSyncExternalStore` consumers.
type Handler<T> = (arg: T) => void;

const { mockGetUser, mockSignoutRedirect, handlers } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockSignoutRedirect: vi.fn(),
  handlers: {
    userLoaded: undefined as Handler<User> | undefined,
    silentRenewError: undefined as Handler<unknown> | undefined,
    userUnloaded: undefined as Handler<void> | undefined,
  },
}));

vi.mock('./authClient', () => ({
  authClient: {
    getUser: mockGetUser,
    signinRedirect: vi.fn(),
    signoutRedirect: mockSignoutRedirect,
    events: {
      addUserLoaded: (fn: Handler<User>) => {
        handlers.userLoaded = fn;
      },
      removeUserLoaded: vi.fn(),
      addSilentRenewError: (fn: Handler<unknown>) => {
        handlers.silentRenewError = fn;
      },
      removeSilentRenewError: vi.fn(),
      addUserUnloaded: (fn: Handler<void>) => {
        handlers.userUnloaded = fn;
      },
      removeUserUnloaded: vi.fn(),
    },
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

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('AuthProvider (integration: oidc-client-ts events -> sessionStore -> useSyncExternalStore)', () => {
  const TENANT_A = '019f9b0b-e7fb-7ac6-84b7-5c8ed52c6120';

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStore.reset();
    handlers.userLoaded = undefined;
    handlers.silentRenewError = undefined;
    handlers.userUnloaded = undefined;
    mockGetUser.mockResolvedValue(makeOidcUser(TENANT_A));
  });

  it('re-renders consumers to authenticated when oidc-client-ts fires addUserLoaded (spec FR-007)', async () => {
    mockGetUser.mockResolvedValue(null);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.session.status).toBe('unauthenticated'));

    act(() => {
      handlers.userLoaded?.(makeOidcUser(TENANT_A));
    });

    await waitFor(() => {
      expect(result.current.session.status).toBe('authenticated');
      expect(result.current.tenant).toEqual({ tenantId: TENANT_A });
    });
  });

  it('re-renders consumers to unauthenticated/renewal_failed when oidc-client-ts fires addSilentRenewError (spec FR-009)', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.session.status).toBe('authenticated'));

    act(() => {
      handlers.silentRenewError?.(new Error('renewal failed'));
    });

    await waitFor(() => {
      expect(result.current.session.status).toBe('unauthenticated');
      expect(result.current.session.failureReason).toBe('renewal_failed');
    });
  });

  it('ignores a UserUnloaded event that fires mid-logout, instead of racing a second signinRedirect against the sign-out navigation', async () => {
    // Regression test: oidc-client-ts's real signoutRedirect() clears the local user (firing
    // UserUnloaded) *before* it finishes navigating to identity-service's end-session endpoint.
    // Reacting to that event by redirecting to /login (which immediately calls signinRedirect()
    // itself) raced the actual sign-out navigation — observed in manual testing as the browser
    // landing on identity-service's login form via a fresh /connect/authorize request instead of
    // a clean end-session round-trip.
    let resolveSignout!: () => void;
    mockSignoutRedirect.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSignout = resolve;
      }),
    );

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.session.status).toBe('authenticated'));

    const logoutPromise = result.current.logout();

    act(() => {
      handlers.userUnloaded?.();
    });

    // Still authenticated: the mid-logout UserUnloaded event must not drive a redirect while
    // the real sign-out navigation is still in flight.
    expect(result.current.session.status).toBe('authenticated');

    resolveSignout();
    await logoutPromise;
  });
});
