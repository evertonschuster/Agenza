import { useAuth } from '@/features/auth/presentation/useAuth'
import type { TenantContext } from '@/features/auth/application/context/TenantContext'

export function useAuthenticatedTenant(): TenantContext {
  const auth = useAuth()

  if (auth.status !== 'authenticated') {
    throw new Error('useAuthenticatedTenant must be used within an authenticated route')
  }

  return auth.tenantContext
}
