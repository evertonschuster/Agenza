import type { JSX } from 'react'
import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../hooks/useAuth'

/**
 * Wraps routes that require an authenticated session. Renders child
 * routes when authenticated, redirects to /login when not, and shows
 * a neutral loading state while the session check is in flight so the
 * user never sees an unwanted redirect due to a race condition.
 */
export function ProtectedRoute(): JSX.Element {
  const { status } = useAuth()

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
