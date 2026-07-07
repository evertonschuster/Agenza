import { useCallback, useState } from 'react'
import { useAppContainer } from './useAppContainer'
import { useAsync } from './useAsync'
import type { TenantContext } from '../../application/context/TenantContext'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export interface UseAuthResult {
  status: AuthStatus
  tenantContext: TenantContext | null
  login: () => Promise<void>
  logout: () => Promise<void>
}

/**
 * The single hook pages and route guards use to read and act on
 * authentication state. Wraps GetCurrentSession in useAsync (the shared
 * loading pattern) and exposes login/logout as simple async actions that
 * delegate to InitiateLogin/Logout - components never call a use case or
 * the AuthRepository directly.
 */
export function useAuth(): UseAuthResult {
  const { useCases } = useAppContainer()
  const [tenantContext, setTenantContext] = useState<TenantContext | null>(null)

  const getCurrentSession = useCallback(async (): Promise<TenantContext | null> => {
    const result = await useCases.getCurrentSession.execute()
    setTenantContext(result)
    return result
  }, [useCases])

  const { status: loadStatus } = useAsync(getCurrentSession)

  const status: AuthStatus =
    loadStatus === 'loading'
      ? 'loading'
      : tenantContext !== null
        ? 'authenticated'
        : 'unauthenticated'

  const login = useCallback(async (): Promise<void> => {
    await useCases.initiateLogin.execute()
  }, [useCases])

  const logout = useCallback(async (): Promise<void> => {
    await useCases.logout.execute()
    setTenantContext(null)
  }, [useCases])

  return { status, tenantContext, login, logout }
}
