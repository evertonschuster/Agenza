import { createContext } from 'react';
import type { AuthenticatedUser } from '../domain/user';
import type { Session } from '../domain/session';
import type { TenantContext } from '../domain/tenant';

export interface AuthContextValue {
  session: Session;
  tenant: TenantContext | null;
  user: AuthenticatedUser | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
