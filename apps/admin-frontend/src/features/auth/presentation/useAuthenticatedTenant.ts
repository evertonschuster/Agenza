import { useAuth } from '@/features/auth/presentation/useAuth'
import type { TenantContext } from '@/features/auth/application/context/TenantContext'

/**
 * For components that only ever render inside ProtectedRoute (e.g.
 * AdminLayout), where an unauthenticated/loading session is not a state
 * the component can actually be shown in - throws instead of falling back
 * to a placeholder, rather than defending against a combination the router
 * already rules out.
 */
export function useAuthenticatedTenant(): TenantContext {
  const auth = useAuth()

  if (auth.status !== 'authenticated') {
    throw new Error('useAuthenticatedTenant must be used within an authenticated route')
  }

  return auth.tenantContext
}
