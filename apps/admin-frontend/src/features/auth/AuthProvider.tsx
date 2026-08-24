import { createContext, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { sessionStore } from './sessionStore';
import type { AuthenticatedUser, Session, TenantContext } from './types';

export interface AuthContextValue {
  session: Session;
  tenant: TenantContext | null;
  user: AuthenticatedUser | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

// Module-level (not created inside AuthProvider) so they're stable across renders by
// construction — `sessionStore` is a singleton, so these never need to change.
const login = () => sessionStore.login();
const logout = () => sessionStore.logout();

/**
 * Thin adapter between React and `sessionStore` (the actual application logic — see
 * sessionStore.ts). Subscribes via `useSyncExternalStore` since the session is genuinely
 * external mutable state (owned by `oidc-client-ts`'s event emitter), not component state.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot);

  useEffect(() => sessionStore.startListening(), []);

  const value: AuthContextValue = {
    session: snapshot.session,
    tenant: snapshot.tenant,
    user: snapshot.user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
