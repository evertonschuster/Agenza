import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { User } from 'oidc-client-ts';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './hooks/useAuth';

type Handler<T> = (arg: T) => void;

const { mockGetUser, handlers } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  handlers: {
    userLoaded: undefined as Handler<User> | undefined,
    silentRenewError: undefined as Handler<unknown> | undefined,
  },
}));

vi.mock('./authClient', () => ({
  authClient: {
    getUser: mockGetUser,
    signinRedirect: vi.fn(),
    signoutRedirect: vi.fn(),
    events: {
      addUserLoaded: (fn: Handler<User>) => {
        handlers.userLoaded = fn;
      },
      removeUserLoaded: vi.fn(),
      addSilentRenewError: (fn: Handler<unknown>) => {
        handlers.silentRenewError = fn;
      },
      removeSilentRenewError: vi.fn(),
      addUserUnloaded: vi.fn(),
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

describe('AuthProvider silent renewal (spec FR-007, FR-009)', () => {
  const TENANT_A = '019f9b0b-e7fb-7ac6-84b7-5c8ed52c6120';
  const TENANT_B = '11111111-1111-1111-1111-111111111111';

  beforeEach(() => {
    vi.clearAllMocks();
    handlers.userLoaded = undefined;
    handlers.silentRenewError = undefined;
    mockGetUser.mockResolvedValue(makeOidcUser(TENANT_A));
  });

  it('stays authenticated when a silent renewal succeeds', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.session.status).toBe('authenticated'));

    act(() => {
      handlers.userLoaded?.(makeOidcUser(TENANT_A));
    });

    await waitFor(() => {
      expect(result.current.session.status).toBe('authenticated');
    });
  });

  it('transitions to unauthenticated with renewal_failed when silent renewal fails', async () => {
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

  it('re-resolves Tenant Context when the tenant_id claim changes on a successful renewal (spec Edge Case, G3)', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.tenant?.tenantId).toBe(TENANT_A));

    act(() => {
      handlers.userLoaded?.(makeOidcUser(TENANT_B));
    });

    await waitFor(() => {
      expect(result.current.tenant?.tenantId).toBe(TENANT_B);
    });
  });
});
