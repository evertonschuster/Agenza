import { useCallback, useEffect, useMemo, type ReactNode, type JSX } from 'react'
import { AuthContext, type AuthContextValue } from '@/features/auth/presentation/AuthContext'
import { useAppContainer } from '@/app/providers/useAppContainer'
import { useAsync } from '@/shared/presentation/hooks/useAsync'
import type { TenantContext } from '@/features/auth/application/context/TenantContext'

interface AuthProviderProps {
  children: ReactNode
}

// Mounted once near the root so every useAuth() consumer reads the same
// snapshot, instead of each call site polling getCurrentSession() itself.
export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const { auth } = useAppContainer()

  const getCurrentSession = useCallback(async (): Promise<TenantContext | null> => {
    return auth.getCurrentSession.execute()
  }, [auth])

  const { status: loadStatus, data: tenantContext, mutate } = useAsync(getCurrentSession)

  useEffect(() => {
    // No expectedGeneration passed: invalidation is authoritative and must
    // win regardless of what else happens to be in flight.
    return auth.sessionEvents.subscribe(() => {
      mutate(() => null)
    })
  }, [auth, mutate])

  const login = useCallback(async (): Promise<void> => {
    await auth.initiateLogin.execute()
  }, [auth])

  const logout = useCallback(async (): Promise<void> => {
    await auth.logout.execute()
    mutate(() => null)
  }, [auth, mutate])

  const value = useMemo<AuthContextValue>(() => {
    if (loadStatus === 'loading') {
      return { status: 'loading', tenantContext: null, login, logout }
    }
    if (tenantContext !== null) {
      return { status: 'authenticated', tenantContext, login, logout }
    }
    return { status: 'unauthenticated', tenantContext: null, login, logout }
  }, [loadStatus, tenantContext, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
