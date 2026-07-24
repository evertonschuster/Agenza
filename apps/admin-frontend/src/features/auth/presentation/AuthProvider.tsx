import { useCallback, useEffect, useMemo, type ReactNode, type JSX } from 'react'
import { AuthContext, type AuthContextValue } from '@/features/auth/presentation/AuthContext'
import { useAppContainer } from '@/app/providers/useAppContainer'
import { useAsync } from '@/shared/presentation/hooks/useAsync'
import type { TenantContext } from '@/features/auth/application/context/TenantContext'

interface AuthProviderProps {
  children: ReactNode
}

/**
 * The single source of truth for session state in the app - mounted once
 * near the root (see AppProviders), so every consumer of useAuth() reads
 * the same snapshot instead of each call site running its own independent
 * getCurrentSession() fetch (the bug this replaces).
 *
 * Builds on useAsync for the initial session load - reusing its existing
 * out-of-order/unmount guarding - and additionally subscribes to the
 * composition root's SessionEventBus so a 401 anywhere in the app (reported
 * by AuthenticatedHttpClient, with no knowledge of React) clears the shared
 * session via the same `mutate` used for user-initiated logout. Both paths
 * clear tenantContext synchronously; ProtectedRoute reacts to the resulting
 * `unauthenticated` status and TenantBoundary remounts tenant-scoped state.
 */
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
