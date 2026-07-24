import { createContext } from 'react'
import type { TenantContext } from '@/features/auth/application/context/TenantContext'

export type AuthSessionState =
  | { status: 'loading'; tenantContext: null }
  | { status: 'unauthenticated'; tenantContext: null }
  | { status: 'authenticated'; tenantContext: TenantContext }

export type AuthStatus = AuthSessionState['status']

export interface AuthActions {
  login: () => Promise<void>
  logout: () => Promise<void>
}

export type AuthContextValue = AuthSessionState & AuthActions

/**
 * Holds the single, shared session snapshot for the whole app - populated
 * by AuthProvider. Starts as null so useAuth can fail loudly if a component
 * tries to use it outside of AuthProvider, rather than silently reading an
 * unconfigured value (same rationale as AppContainerContext).
 */
export const AuthContext = createContext<AuthContextValue | null>(null)
