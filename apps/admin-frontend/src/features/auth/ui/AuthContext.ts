import { createContext } from 'react';
import type { AuthenticatedUser, Session } from '../model/session';
import type { TenantContext } from '../model/tenant';

export interface AuthContextValue {
  session: Session;
  tenant: TenantContext | null;
  user: AuthenticatedUser | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
