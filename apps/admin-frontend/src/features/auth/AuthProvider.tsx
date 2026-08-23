import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { User } from 'oidc-client-ts';
import { authClient } from './authClient';
import { resolveTenantContext } from './tenant';
import { logAuthEvent } from './authEvents';
import { INITIAL_SESSION, type AuthenticatedUser, type Session, type TenantContext } from './types';

export interface AuthContextValue {
  session: Session;
  tenant: TenantContext | null;
  user: AuthenticatedUser | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

interface Resolved {
  session: Session;
  tenant: TenantContext | null;
  user: AuthenticatedUser;
}

/** Data-model.md's `authenticating -> authenticated | unauthenticated(missing_tenant_claim)` transition. */
function resolveFromOidcUser(oidcUser: User): Resolved {
  const tenant = resolveTenantContext(oidcUser.access_token);
  const user: AuthenticatedUser = {
    displayName: typeof oidcUser.profile.name === 'string' ? oidcUser.profile.name : null,
    email: typeof oidcUser.profile.email === 'string' ? oidcUser.profile.email : null,
  };

  if (!tenant) {
    return {
      session: { ...INITIAL_SESSION, failureReason: 'missing_tenant_claim' },
      tenant: null,
      user,
    };
  }

  return {
    session: {
      status: 'authenticated',
      accessToken: oidcUser.access_token,
      expiresAt: oidcUser.expires_at ? oidcUser.expires_at * 1000 : null,
      failureReason: null,
    },
    tenant,
    user,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(INITIAL_SESSION);
  const [tenant, setTenant] = useState<TenantContext | null>(null);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);

  // Event handlers registered once on mount close over stale state without this ref.
  const tenantRef = useRef<TenantContext | null>(null);
  useEffect(() => {
    tenantRef.current = tenant;
  }, [tenant]);

  useEffect(() => {
    let cancelled = false;

    authClient
      .getUser()
      .then((oidcUser) => {
        if (cancelled) return;
        if (!oidcUser || oidcUser.expired) {
          setSession(INITIAL_SESSION);
          return;
        }
        const resolved = resolveFromOidcUser(oidcUser);
        setSession(resolved.session);
        setTenant(resolved.tenant);
        setUser(resolved.user);
      })
      .catch(() => {
        if (cancelled) return;
        setSession({ ...INITIAL_SESSION, failureReason: 'identity_unreachable' });
      });

    const handleUserLoaded = (oidcUser: User) => {
      const resolved = resolveFromOidcUser(oidcUser);
      const wasAuthenticated = tenantRef.current !== null;
      setSession(resolved.session);
      setTenant(resolved.tenant);
      setUser(resolved.user);
      if (resolved.session.status === 'authenticated' && !wasAuthenticated) {
        logAuthEvent('login_success', resolved.tenant?.tenantId ?? null);
      }
    };

    const handleSilentRenewError = () => {
      setSession({ ...INITIAL_SESSION, failureReason: 'renewal_failed' });
      logAuthEvent('renewal_failure', tenantRef.current?.tenantId ?? null);
    };

    const handleUserUnloaded = () => {
      setSession(INITIAL_SESSION);
      setTenant(null);
      setUser(null);
    };

    authClient.events.addUserLoaded(handleUserLoaded);
    authClient.events.addSilentRenewError(handleSilentRenewError);
    authClient.events.addUserUnloaded(handleUserUnloaded);

    return () => {
      cancelled = true;
      authClient.events.removeUserLoaded(handleUserLoaded);
      authClient.events.removeSilentRenewError(handleSilentRenewError);
      authClient.events.removeUserUnloaded(handleUserUnloaded);
    };
  }, []);

  const login = useCallback(async () => {
    setSession((prev) => ({ ...prev, status: 'authenticating' }));
    try {
      await authClient.signinRedirect();
    } catch {
      setSession({ ...INITIAL_SESSION, failureReason: 'identity_unreachable' });
      logAuthEvent('login_failure', null);
    }
  }, []);

  const logout = useCallback(async () => {
    logAuthEvent('logout', tenantRef.current?.tenantId ?? null);
    await authClient.signoutRedirect();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ session, tenant, user, login, logout }),
    [session, tenant, user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
