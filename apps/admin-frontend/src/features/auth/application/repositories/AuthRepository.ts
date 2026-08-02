import { Session } from '@/features/auth/domain/entities/Session'
import type { AuthFlowError } from '@/features/auth/application/errors/AuthFlowError'
import type { Result } from '@/shared/application/Result'

export interface AuthCallbackResult {
  session: Session
  returnTo: string | null
}

export type LoginTheme = 'light' | 'dark'

export interface AuthRepository {
  initiateLogin(returnTo: string, theme: LoginTheme): Promise<Result<void, AuthFlowError>>

  // callbackUrl is the full redirect-back URL (query/fragment included),
  // kept as a plain string so this port has no routing-library dependency.
  handleCallback(callbackUrl: string): Promise<Result<AuthCallbackResult, AuthFlowError>>

  // Never fails in a way a caller needs to distinguish - null already means
  // "no usable session" whether that's because none exists, renewal
  // failed, or the cached data was malformed. See docs/adr/014.
  getCurrentSession(): Promise<Session | null>

  logout(): Promise<Result<void, AuthFlowError>>
}
