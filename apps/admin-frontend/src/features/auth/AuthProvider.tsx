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
    login: () => sessionStore.login(),
    logout: () => sessionStore.logout(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
