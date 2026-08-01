import { useCallback, useEffect, useMemo, type ReactNode, type JSX } from 'react'
import { AuthContext, type AuthContextValue } from '@/features/auth/presentation/AuthContext'
import { useAppContainer } from '@/app/providers/useAppContainer'
import { useAsync } from '@/shared/presentation/hooks/useAsync'
import { success, type Result } from '@/shared/application/Result'
import type { AuthFlowError } from '@/features/auth/application/errors/AuthFlowError'
import type { TenantContext } from '@/features/auth/application/context/TenantContext'
import type { LoginTheme } from '@/features/auth/application/repositories/AuthRepository'

interface AuthProviderProps {
  children: ReactNode
}

// Mounted once near the root so every useAuth() consumer reads the same
// snapshot, instead of each call site polling getCurrentSession() itself.
export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const { auth } = useAppContainer()

  // getCurrentSession never fails in a way this hook needs to distinguish
  // (docs/adr/014) - it's already a plain Promise<TenantContext | null>,
  // so this only adapts it to useAsync's Result-returning contract.
  const getCurrentSession = useCallback(async (): Promise<Result<TenantContext | null, never>> => {
    return success(await auth.getCurrentSession.execute())
  }, [auth])

  const { status: loadStatus, data: tenantContext, mutate } = useAsync(getCurrentSession)

  useEffect(() => {
    // No expectedGeneration passed: invalidation is authoritative and must
    // win regardless of what else happens to be in flight.
    return auth.sessionEvents.subscribe(() => {
      mutate(() => null)
    })
  }, [auth, mutate])

  const login = useCallback(
    async (
      returnTo: string | undefined,
      theme: LoginTheme,
    ): Promise<Result<void, AuthFlowError>> => {
      return auth.initiateLogin.execute(returnTo, theme)
    },
    [auth],
  )

  const completeLogin = useCallback(
    async (callbackUrl: string): Promise<Result<string, AuthFlowError>> => {
      const result = await auth.handleAuthCallback.execute(callbackUrl)
      if (!result.success) {
        return result
      }
      mutate(() => result.value.tenantContext)
      return success(result.value.returnTo)
    },
    [auth, mutate],
  )

  const logout = useCallback(async (): Promise<Result<void, AuthFlowError>> => {
    const result = await auth.logout.execute()
    // The local session is meaningfully gone even if ending the identity
    // provider's own session afterward failed - never leave the app
    // believing the user is still signed in.
    mutate(() => null)
    return result
  }, [auth, mutate])

  const value = useMemo<AuthContextValue>(() => {
    if (loadStatus === 'loading') {
      return { status: 'loading', tenantContext: null, login, completeLogin, logout }
    }
    if (tenantContext !== null) {
      return { status: 'authenticated', tenantContext, login, completeLogin, logout }
    }
    return { status: 'unauthenticated', tenantContext: null, login, completeLogin, logout }
  }, [loadStatus, tenantContext, login, completeLogin, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
