import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from '@/features/auth/presentation/AuthContext'

export type UseAuthResult = AuthContextValue

/**
 * Reads the shared session snapshot from AuthProvider. This hook has no
 * state of its own - every consumer sees the exact same status/tenantContext,
 * updated by exactly one place (AuthProvider), instead of each call site
 * independently polling getCurrentSession() (the previous, per-call-site
 * implementation this replaces).
 */
export function useAuth(): UseAuthResult {
  const context = useContext(AuthContext)

  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
