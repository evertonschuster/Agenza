import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { sessionStore } from '@/shared/session/sessionStore';
import { AuthContext, type AuthContextValue } from './AuthContext';
import { login, logout, startListening } from '../model/sessionDriver';

export function AuthProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot);

  useEffect(() => startListening(), []);

  const value: AuthContextValue = {
    session: snapshot.session,
    tenant: snapshot.tenant,
    user: snapshot.user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
