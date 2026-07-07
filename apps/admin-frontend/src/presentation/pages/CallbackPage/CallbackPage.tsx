import { useEffect, useState, type JSX } from 'react'
import { useNavigate } from 'react-router'
import { useAppContainer } from '../../hooks/useAppContainer'

type CallbackStatus = 'processing' | 'error'

/**
 * The landing route after IdentityServer redirects back with an
 * authorization code. Calls HandleAuthCallback with the full current
 * URL (which oidc-client-ts reads to extract the code and state
 * parameters), then navigates to the dashboard on success or shows an
 * error on failure. This page should never be visible for more than a
 * moment in the happy path.
 */
export function CallbackPage(): JSX.Element {
  const { useCases } = useAppContainer()
  const navigate = useNavigate()
  const [status, setStatus] = useState<CallbackStatus>('processing')

  useEffect(() => {
    async function completeLogin(): Promise<void> {
      try {
        await useCases.handleAuthCallback.execute(window.location.href)
        await navigate('/dashboard', { replace: true })
      } catch {
        setStatus('error')
      }
    }

    void completeLogin()
    // Intentionally runs once on mount only - the callback URL is
    // captured from window.location.href at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm rounded-xl border border-red-100 bg-white px-8 py-10 text-center shadow-sm">
          <p className="text-sm font-semibold text-red-600">Sign-in failed</p>
          <p className="mt-2 text-sm text-slate-500">
            Something went wrong completing your sign-in. Please try again.
          </p>
          <a
            href="/login"
            className="mt-6 inline-block text-sm font-medium text-teal-600 hover:text-teal-700"
          >
            Back to sign in
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
        <p className="text-sm text-slate-500">Completing sign in…</p>
      </div>
    </div>
  )
}
