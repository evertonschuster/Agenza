import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from '@/features/auth/presentation/AuthContext'

export type UseAuthResult = AuthContextValue

export function useAuth(): UseAuthResult {
  const context = useContext(AuthContext)

  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
