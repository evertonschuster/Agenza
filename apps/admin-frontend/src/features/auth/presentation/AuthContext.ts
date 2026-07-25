import { createContext } from 'react'
import type { TenantContext } from '@/features/auth/application/context/TenantContext'
import type { LoginTheme } from '@/features/auth/application/repositories/AuthRepository'

export type AuthSessionState =
  | { status: 'loading'; tenantContext: null }
  | { status: 'unauthenticated'; tenantContext: null }
  | { status: 'authenticated'; tenantContext: TenantContext }

export type AuthStatus = AuthSessionState['status']

export interface AuthActions {
  login: (returnTo: string | undefined, theme: LoginTheme) => Promise<void>
  completeLogin: (callbackUrl: string) => Promise<string>
  logout: () => Promise<void>
}

export type AuthContextValue = AuthSessionState & AuthActions

export const AuthContext = createContext<AuthContextValue | null>(null)
