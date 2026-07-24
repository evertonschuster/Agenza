import type { JSX } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/features/auth/presentation/useAuth'
import { FullScreenSpinner } from '@/shared/presentation/components/FullScreenSpinner'

export function ProtectedRoute(): JSX.Element {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <FullScreenSpinner />
  }

  if (status === 'unauthenticated') {
    const returnTo = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to="/login" replace state={{ returnTo }} />
  }

  return <Outlet />
}
