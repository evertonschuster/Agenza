import type { JSX } from 'react'
import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import { FullScreenSpinner } from '../components/FullScreenSpinner'

export function ProtectedRoute(): JSX.Element {
  const { status } = useAuth()

  if (status === 'loading') {
    return <FullScreenSpinner />
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
