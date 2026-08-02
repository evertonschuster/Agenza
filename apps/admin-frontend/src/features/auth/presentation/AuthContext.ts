import { createContext } from 'react'
import type { TenantContext } from '@/features/auth/application/context/TenantContext'
import type { LoginTheme } from '@/features/auth/application/repositories/AuthRepository'
import type { AuthFlowError } from '@/features/auth/application/errors/AuthFlowError'
import type { Result } from '@/shared/application/Result'

export type AuthSessionState =
  | { status: 'loading'; tenantContext: null }
  | { status: 'unauthenticated'; tenantContext: null }
  | { status: 'authenticated'; tenantContext: TenantContext }

export type AuthStatus = AuthSessionState['status']

export interface AuthActions {
  login: (returnTo: string | undefined, theme: LoginTheme) => Promise<Result<void, AuthFlowError>>
  completeLogin: (callbackUrl: string) => Promise<Result<string, AuthFlowError>>
  logout: () => Promise<Result<void, AuthFlowError>>
}

export type AuthContextValue = AuthSessionState & AuthActions

export const AuthContext = createContext<AuthContextValue | null>(null)
