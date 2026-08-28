import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { AuthContext, type AuthContextValue } from './AuthContext';
import { sessionStore } from '../model/sessionStore';

const login = () => sessionStore.login();
const logout = () => sessionStore.logout();

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
